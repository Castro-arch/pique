import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { internalMutation, internalQuery, mutation, query, type MutationCtx } from './_generated/server';
import { requireMember, requireUser } from './lib';

// Avisos da partida. Cada jogador recebe os seus: o app Android mostra como
// notificação quando está em segundo plano (alerts.mine), e o site recebe
// como push (push.send), mesmo com o celular bloqueado.

const KEEP = 8; // o app só precisa dos últimos

export async function notify(ctx: MutationCtx, players: Doc<'players'>[], kind: string, title: string, body: string) {
  const to = players.filter((p) => p.state !== 'left');
  if (to.length === 0) return;
  const at = Date.now();
  for (const p of to) await ctx.db.insert('alerts', { gameId: p.gameId, playerId: p._id, kind, title, body, at });
  await ctx.scheduler.runAfter(0, internal.push.send, { userIds: to.map((p) => p.userId), title, body, tag: kind });
}

// Os últimos avisos do jogador. O app compara com os que já mostrou.
export const mine = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const { me } = await requireMember(ctx, gameId);
    const rows = await ctx.db
      .query('alerts')
      .withIndex('by_player', (q) => q.eq('playerId', me._id))
      .order('desc')
      .take(KEEP);
    return rows.map((a) => ({ id: a._id, kind: a.kind, title: a.title, body: a.body, at: a.at }));
  },
});

// ── Push do site ───────────────────────────────────────────────────────

export const saveSubscription = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, sub) => {
    const userId = await requireUser(ctx);
    const old = await ctx.db.query('push_subscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', sub.endpoint)).unique();
    if (old) await ctx.db.patch(old._id, { userId, p256dh: sub.p256dh, auth: sub.auth, at: Date.now() });
    else await ctx.db.insert('push_subscriptions', { userId, ...sub, at: Date.now() });
  },
});

export const subscriptionsFor = internalQuery({
  args: { userIds: v.array(v.id('users')) },
  handler: async (ctx, { userIds }) => {
    const subs = [];
    for (const userId of userIds) {
      subs.push(...(await ctx.db.query('push_subscriptions').withIndex('by_user', (q) => q.eq('userId', userId)).collect()));
    }
    return subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }));
  },
});

// O navegador cancelou a inscrição (404/410): some daqui também.
export const dropSubscription = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const sub = await ctx.db.query('push_subscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint)).unique();
    if (sub) await ctx.db.delete(sub._id);
  },
});
