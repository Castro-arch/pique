import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { LEGAL_VERSION } from './legalVersion';
import { newCode as randomCode, requireUser } from './lib';

// Teste fechado com código de convite. Existe um código "atual" (o último
// criado), com um número de versão. Quem digita o código guarda a versão; ao
// gerar um código novo, a versão sobe e todo mundo que entrou com o anterior
// perde o acesso até digitar o novo. Sem nenhum código criado, o app fica aberto.
// Quem administra o teste (BETA_ADMINS, nas variáveis do Convex, separados por
// vírgula: e-mails ou o id da conta, para contas sem e-mail) nunca é barrado e
// vê/troca o código nos Ajustes. Nunca pelo @: o @ é escolhido pela própria
// pessoa e fica livre se o dono trocar ou excluir a conta.
//   npx convex run beta:createCode         (gera um código novo pelo terminal)
//   npx convex run beta:currentCode        (mostra o código atual)

type Ctx = QueryCtx;

const normalize = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

export function isBetaAdmin(user: Pick<Doc<'users'>, '_id' | 'email'>) {
  const admins = (process.env.BETA_ADMINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const email = user.email?.toLowerCase();
  return admins.includes(user._id) || (!!email && admins.map((a) => a.toLowerCase()).includes(email));
}

async function currentInvite(ctx: Ctx) {
  return await ctx.db.query('beta_invites').order('desc').first();
}

export async function hasBetaAccess(ctx: Ctx, user: Doc<'users'>) {
  const invite = await currentInvite(ctx);
  if (!invite) return true;
  if (isBetaAdmin(user)) return true;
  return user.betaVersion === invite.version;
}

// Para as mutações que começam algo novo (criar ou entrar numa partida).
export async function requireBeta(ctx: Ctx, userId: Id<'users'>) {
  const user = await ctx.db.get(userId);
  if (!user || !(await hasBetaAccess(ctx, user))) throw new ConvexError('Seu convite do teste não vale mais. Peça o código novo para quem te convidou.');
}

// Para jogar de verdade (criar ou entrar numa partida): convite válido, termos
// aceitos na versão atual e perfil com @. As telas do app já pedem isso, mas o
// servidor confere também, para ninguém pular as etapas chamando direto.
export async function requirePlayable(ctx: Ctx, userId: Id<'users'>) {
  await requireBeta(ctx, userId);
  const user = (await ctx.db.get(userId))!;
  if (user.termsVersion !== LEGAL_VERSION) throw new ConvexError('Aceite os Termos de uso e a Política de privacidade para jogar.');
  if (!user.username) throw new ConvexError('Escolha seu nome e @ para jogar.');
}

// A pessoa digita o código de convite. No máximo 10 erros por hora por conta,
// para ninguém adivinhar o código tentando em massa. O erro volta como resposta
// (e não como exceção) porque a exceção desfaria a contagem.
const INVITE_MAX_FAILS = 10;
const INVITE_FAIL_WINDOW_MS = 60 * 60 * 1000;
export const redeem = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const userId = await requireUser(ctx);
    const user = (await ctx.db.get(userId))!;
    const invite = await currentInvite(ctx);
    if (!invite) return { ok: true };
    const now = Date.now();
    const fails = user.inviteFails && now - user.inviteFails.since < INVITE_FAIL_WINDOW_MS ? user.inviteFails : { count: 0, since: now };
    if (fails.count >= INVITE_MAX_FAILS) return { ok: false, error: 'Muitas tentativas. Espere um pouco e confira o código com quem te convidou.' };
    if (normalize(code) !== invite.code) {
      await ctx.db.patch(userId, { inviteFails: { count: fails.count + 1, since: fails.since } });
      return { ok: false, error: 'Código inválido. Confira com quem te convidou.' };
    }
    await ctx.db.patch(userId, { betaVersion: invite.version, inviteFails: undefined });
    return { ok: true };
  },
});

// Para os Ajustes de quem administra: o código atual e quantos entraram com ele.
export const adminView = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user || !isBetaAdmin(user)) return null;
    const invite = await currentInvite(ctx);
    if (!invite) return { code: null, version: 0, createdAt: null, members: 0 };
    const members = (await ctx.db.query('users').collect()).filter((u) => u.betaVersion === invite.version).length;
    return { code: invite.code, version: invite.version, createdAt: invite.createdAt, members };
  },
});

async function makeCode(ctx: MutationCtx, code?: string) {
  const last = await currentInvite(ctx);
  // escolhido à mão só pelo terminal (createCode); pelo app é sempre sorteado
  const next = code ? normalize(code) : randomCode();
  if (next.length !== 6) throw new ConvexError('O código precisa ter 6 letras ou números.');
  await ctx.db.insert('beta_invites', { code: next, version: (last?.version ?? 0) + 1, createdAt: Date.now() });
  return next;
}

// Gerar um código novo pelo app (só quem administra). Revoga o anterior.
export const rotate = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const user = await ctx.db.get(userId);
    if (!user || !isBetaAdmin(user)) throw new ConvexError('Só quem administra o teste pode trocar o código.');
    // pelo app o código é sempre sorteado: escolhido à mão ("PIQUE1") é fácil de adivinhar
    return await makeCode(ctx);
  },
});

// Pelo terminal: npx convex run beta:createCode  (ou '{"code":"PIQUE1"}')
export const createCode = internalMutation({
  args: { code: v.optional(v.string()) },
  handler: async (ctx, { code }) => await makeCode(ctx, code),
});

export const currentCode = internalQuery({
  args: {},
  handler: async (ctx) => {
    const invite = await currentInvite(ctx);
    return invite ? { code: invite.code, version: invite.version, createdAt: new Date(invite.createdAt).toISOString() } : null;
  },
});
