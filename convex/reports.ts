import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { requireUser } from './lib';

// Denúncia e bloqueio entre jogadores. A pessoa denunciada nunca fica sabendo
// quem denunciou. Bloquear tem efeito de verdade: um não entra na partida em
// que o outro está, não manda pedido de amizade, e as mensagens do bloqueado
// somem do rádio de quem bloqueou.
// Para quem administra o teste, pelo terminal:
//   npx convex run reports:recent            (últimas denúncias)

export const REPORT_REASONS = ['Mensagens ofensivas no Radio', 'Disse que pegou sem pegar', 'Jogou de um jeito perigoso', 'Outra coisa'] as const;
const MAX_REPORTS_PER_DAY = 20;
const DAY = 24 * 60 * 60 * 1000;

// Algum dos dois bloqueou o outro?
export async function blockedBetween(ctx: QueryCtx, a: Id<'users'>, b: Id<'users'>) {
  const ab = await ctx.db.query('blocks').withIndex('by_pair', (q) => q.eq('userId', a).eq('blockedId', b)).first();
  if (ab) return true;
  const ba = await ctx.db.query('blocks').withIndex('by_pair', (q) => q.eq('userId', b).eq('blockedId', a)).first();
  return !!ba;
}

// Quem eu bloqueei (para esconder as mensagens deles do meu rádio).
export async function blockedBy(ctx: QueryCtx, userId: Id<'users'>) {
  const rows = await ctx.db.query('blocks').withIndex('by_user', (q) => q.eq('userId', userId)).collect();
  return new Set(rows.map((r) => r.blockedId));
}

export const create = mutation({
  args: { gameId: v.id('games'), playerId: v.id('players'), reason: v.string(), details: v.optional(v.string()), block: v.boolean() },
  handler: async (ctx, { gameId, playerId, reason, details, block }) => {
    const { userId } = await pastMember(ctx, gameId);
    const target = await ctx.db.get(playerId);
    if (!target || target.gameId !== gameId) throw new ConvexError('Esse jogador não está nesta partida.');
    if (target.userId === userId) throw new ConvexError('Esse é você.');
    if (!(REPORT_REASONS as readonly string[]).includes(reason)) throw new ConvexError('Escolha o que aconteceu.');
    const text = details?.trim().slice(0, 300) || undefined;

    const mine = await ctx.db.query('reports').withIndex('by_reporter', (q) => q.eq('reporterId', userId)).order('desc').take(MAX_REPORTS_PER_DAY + 1);
    const today = mine.filter((r) => Date.now() - r.at < DAY);
    if (today.some((r) => r.targetId === target.userId && r.gameId === gameId)) {
      // já denunciou essa pessoa nesta partida: só aplica o bloqueio, se pediu
      if (block) await addBlock(ctx, userId, target.userId);
      return { ok: true as const, duplicate: true };
    }
    if (today.length >= MAX_REPORTS_PER_DAY) throw new ConvexError('Você já mandou muitas denúncias hoje. A gente está olhando.');

    // Contexto para quem modera: as últimas respostas prontas dessa pessoa no rádio desta partida.
    const msgs = await ctx.db
      .query('messages')
      .withIndex('by_game', (q) => q.eq('gameId', gameId))
      .order('desc')
      .take(200);
    const context = msgs
      .filter((m) => m.playerId === playerId)
      .slice(0, 10)
      .map((m) => (m.kind === 'audio' ? `[áudio ${m.seconds ?? 0}s]` : (m.text ?? '')));

    await ctx.db.insert('reports', { reporterId: userId, targetId: target.userId, gameId, reason, details: text, context, at: Date.now(), status: 'open' });
    if (block) await addBlock(ctx, userId, target.userId);
    return { ok: true as const, duplicate: false };
  },
});

async function addBlock(ctx: MutationCtx, userId: Id<'users'>, blockedId: Id<'users'>) {
  const exists = await ctx.db.query('blocks').withIndex('by_pair', (q) => q.eq('userId', userId).eq('blockedId', blockedId)).first();
  if (!exists) await ctx.db.insert('blocks', { userId, blockedId, at: Date.now() });
  // a amizade (ou pedido) entre os dois acaba: senão o bloqueado continuaria vendo quando a pessoa joga
  const [a, b] = userId < blockedId ? [userId, blockedId] : [blockedId, userId];
  for (const f of await ctx.db.query('friendships').withIndex('by_pair', (q) => q.eq('a', a).eq('b', b)).collect()) await ctx.db.delete(f._id);
}

// Quem esteve na partida (mesmo que já tenha saído) até a limpeza de 7 dias.
async function pastMember(ctx: QueryCtx, gameId: Id<'games'>) {
  const userId = await requireUser(ctx);
  const me = await ctx.db
    .query('players')
    .withIndex('by_game_user', (q) => q.eq('gameId', gameId).eq('userId', userId))
    .unique();
  if (!me) throw new ConvexError('Você não está nessa partida.');
  return { userId, me };
}

// Bloquear sem denunciar (ou depois de sair da partida).
export const block = mutation({
  args: { gameId: v.id('games'), playerId: v.id('players') },
  handler: async (ctx, { gameId, playerId }) => {
    const { userId } = await pastMember(ctx, gameId);
    const target = await ctx.db.get(playerId);
    if (!target || target.gameId !== gameId || target.userId === userId) throw new ConvexError('Esse jogador não está nesta partida.');
    await addBlock(ctx, userId, target.userId);
  },
});

// Nome de quem vai ser denunciado (a tela não confia no nome que veio no link).
export const target = query({
  args: { gameId: v.id('games'), playerId: v.id('players') },
  handler: async (ctx, { gameId, playerId }) => {
    const userId = await requireUser(ctx);
    const me = await ctx.db.query('players').withIndex('by_game_user', (q) => q.eq('gameId', gameId).eq('userId', userId)).unique();
    const p = await ctx.db.get(playerId);
    if (!me || !p || p.gameId !== gameId || p.userId === userId) return null;
    return { name: p.name };
  },
});

// Ajustes → Jogadores bloqueados.
export const blocked = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const rows = await ctx.db.query('blocks').withIndex('by_user', (q) => q.eq('userId', userId)).collect();
    const out = [];
    for (const r of rows) {
      const u = await ctx.db.get(r.blockedId);
      if (u) out.push({ userId: u._id, name: u.name ?? 'Jogador', username: u.username ?? null, at: r.at });
    }
    return out.sort((a, b) => b.at - a.at);
  },
});

export const unblock = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId: other }) => {
    const userId = await requireUser(ctx);
    for (const r of await ctx.db.query('blocks').withIndex('by_pair', (q) => q.eq('userId', userId).eq('blockedId', other)).collect()) await ctx.db.delete(r._id);
  },
});

// Rotina diária (crons.ts): denúncias com mais de 6 meses saem.
export const REPORT_KEEP_MS = 180 * DAY;
export const prune = internalMutation({
  args: {},
  handler: async (ctx) => {
    const old = await ctx.db.query('reports').withIndex('by_at', (q) => q.lt('at', Date.now() - REPORT_KEEP_MS)).take(500);
    for (const r of old) await ctx.db.delete(r._id);
  },
});

// Só pelo terminal (quem administra): as denúncias mais recentes, com nomes.
export const recent = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db.query('reports').order('desc').take(Math.min(limit ?? 30, 100));
    const name = async (id: Id<'users'>) => {
      const u = await ctx.db.get(id);
      return u ? `${u.name ?? '?'} (@${u.username ?? '-'})` : 'conta excluída';
    };
    return Promise.all(
      rows.map(async (r) => ({
        quando: new Date(r.at).toISOString(),
        denunciado: await name(r.targetId),
        quemDenunciou: await name(r.reporterId),
        motivo: r.reason,
        detalhes: r.details ?? null,
        radio: r.context,
        status: r.status,
      })),
    );
  },
});
