import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { newCode as randomCode, requireUser } from './lib';

// Teste fechado com código de convite. Existe um código "atual" (o último
// criado), com um número de versão. Quem digita o código guarda a versão; ao
// gerar um código novo, a versão sobe e todo mundo que entrou com o anterior
// perde o acesso até digitar o novo. Sem nenhum código criado, o app fica aberto.
// Quem administra o teste (e-mails em BETA_ADMINS, nas variáveis do Convex,
// separados por vírgula) nunca é barrado e vê/troca o código nos Ajustes.
//   npx convex run beta:createCode         (gera um código novo pelo terminal)
//   npx convex run beta:currentCode        (mostra o código atual)

type Ctx = QueryCtx;

const normalize = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

export function isBetaAdmin(email: string | undefined | null) {
  const admins = (process.env.BETA_ADMINS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && admins.includes(email.toLowerCase());
}

async function currentInvite(ctx: Ctx) {
  return await ctx.db.query('beta_invites').order('desc').first();
}

export async function hasBetaAccess(ctx: Ctx, user: Doc<'users'>) {
  const invite = await currentInvite(ctx);
  if (!invite) return true;
  if (isBetaAdmin(user.email)) return true;
  return user.betaVersion === invite.version;
}

// Para as mutações que começam algo novo (criar ou entrar numa partida).
export async function requireBeta(ctx: Ctx, userId: Id<'users'>) {
  const user = await ctx.db.get(userId);
  if (!user || !(await hasBetaAccess(ctx, user))) throw new ConvexError('Seu convite do teste não vale mais. Peça o código novo para quem te convidou.');
}

// A pessoa digita o código de convite.
export const redeem = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await requireUser(ctx);
    const invite = await currentInvite(ctx);
    if (!invite) return { ok: true };
    if (normalize(code) !== invite.code) throw new ConvexError('Código inválido. Confira com quem te convidou.');
    await ctx.db.patch(userId, { betaVersion: invite.version });
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
    if (!user || !isBetaAdmin(user.email)) return null;
    const invite = await currentInvite(ctx);
    if (!invite) return { code: null, version: 0, createdAt: null, members: 0 };
    const members = (await ctx.db.query('users').collect()).filter((u) => u.betaVersion === invite.version).length;
    return { code: invite.code, version: invite.version, createdAt: invite.createdAt, members };
  },
});

async function makeCode(ctx: MutationCtx, code?: string) {
  const last = await currentInvite(ctx);
  const next = code ? normalize(code) : randomCode();
  if (next.length !== 6) throw new ConvexError('O código precisa ter 6 letras ou números.');
  await ctx.db.insert('beta_invites', { code: next, version: (last?.version ?? 0) + 1, createdAt: Date.now() });
  return next;
}

// Gerar um código novo pelo app (só quem administra). Revoga o anterior.
export const rotate = mutation({
  args: { code: v.optional(v.string()) },
  handler: async (ctx, { code }) => {
    const userId = await requireUser(ctx);
    const user = await ctx.db.get(userId);
    if (!user || !isBetaAdmin(user.email)) throw new ConvexError('Só quem administra o teste pode trocar o código.');
    return await makeCode(ctx, code);
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
