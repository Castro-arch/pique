import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';
import { requireUser } from './lib';
import { levelOf, medalsOf, statsOf } from './profile';

// Amigos (a "crew" de fora da partida): pedido, aceitar, recusar, desfazer.
// Um par de pessoas tem no máximo uma linha em friendships, com a e b em
// ordem (o menor id primeiro) para achar o par de qualquer lado.

const pair = (x: Id<'users'>, y: Id<'users'>) => (x < y ? { a: x, b: y } : { a: y, b: x });

async function link(ctx: QueryCtx, x: Id<'users'>, y: Id<'users'>) {
  const { a, b } = pair(x, y);
  return ctx.db
    .query('friendships')
    .withIndex('by_pair', (q) => q.eq('a', a).eq('b', b))
    .unique();
}

async function allLinks(ctx: QueryCtx, userId: Id<'users'>) {
  const asA = await ctx.db.query('friendships').withIndex('by_pair', (q) => q.eq('a', userId)).collect();
  const asB = await ctx.db.query('friendships').withIndex('by_b', (q) => q.eq('b', userId)).collect();
  return [...asA, ...asB];
}

// Onde a pessoa está jogando agora (lobby ou rodada valendo), se estiver.
export async function liveGameOf(ctx: QueryCtx, userId: Id<'users'>) {
  const rows = await ctx.db
    .query('players')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .order('desc')
    .take(5);
  for (const p of rows) {
    if (p.state === 'left') continue;
    const g = await ctx.db.get(p.gameId);
    if (!g || g.status === 'ended') continue;
    const count = (await ctx.db.query('players').withIndex('by_game', (q) => q.eq('gameId', g._id)).collect()).filter((x) => x.state !== 'left').length;
    return { gameId: g._id, code: g.code, status: g.status, role: p.role ?? null, players: count };
  }
  return null;
}

const card = (u: Doc<'users'>) => ({ id: u._id, name: u.name ?? '?', username: u.username ?? null, frame: u.frame ?? null });

// Quantas partidas duas pessoas jogaram juntas (rodadas da mesma partida contam uma vez).
async function together(ctx: QueryCtx, x: Id<'users'>, y: Id<'users'>) {
  const mine = await ctx.db.query('players').withIndex('by_user', (q) => q.eq('userId', x)).collect();
  let n = 0;
  for (const p of mine) {
    const other = await ctx.db
      .query('players')
      .withIndex('by_game_user', (q) => q.eq('gameId', p.gameId).eq('userId', y))
      .unique();
    if (other) n++;
  }
  return n;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const friends = [];
    const incoming = [];
    const outgoing = [];
    for (const l of await allLinks(ctx, userId)) {
      const otherId = l.a === userId ? l.b : l.a;
      const other = await ctx.db.get(otherId);
      if (!other) continue;
      if (l.status === 'accepted') friends.push({ ...card(other), live: await liveGameOf(ctx, otherId), since: l.at, together: await together(ctx, userId, otherId) });
      else if (l.from === userId) outgoing.push({ ...card(other), at: l.at });
      else incoming.push({ ...card(other), at: l.at });
    }
    // Quem está jogando agora primeiro; depois quem mais jogou com você.
    friends.sort((p, q) => Number(!!q.live) - Number(!!p.live) || q.together - p.together);
    return { friends, incoming, outgoing };
  },
});

// Procura alguém pelo @ (sem o @).
export const find = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const userId = await requireUser(ctx);
    const handle = username.trim().replace(/^@/, '').toLowerCase();
    if (handle.length < 3) return null;
    const u = await ctx.db
      .query('users')
      .withIndex('username', (q) => q.eq('username', handle))
      .unique();
    if (!u) return null;
    const l = u._id === userId ? null : await link(ctx, userId, u._id);
    return { ...card(u), isMe: u._id === userId, status: l ? (l.status === 'accepted' ? 'friend' : l.from === userId ? 'sent' : 'received') : 'none' };
  },
});

export const request = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId: other }) => {
    const userId = await requireUser(ctx);
    if (other === userId) throw new ConvexError('Esse é você.');
    if (!(await ctx.db.get(other))) throw new ConvexError('Essa pessoa não existe mais.');
    const l = await link(ctx, userId, other);
    if (l?.status === 'accepted') return 'friend';
    // A outra pessoa já tinha pedido: os dois querem, vira amizade.
    if (l && l.from !== userId) {
      await ctx.db.patch(l._id, { status: 'accepted', at: Date.now() });
      return 'friend';
    }
    if (l) return 'sent';
    await ctx.db.insert('friendships', { ...pair(userId, other), from: userId, status: 'pending', at: Date.now() });
    return 'sent';
  },
});

export const respond = mutation({
  args: { userId: v.id('users'), accept: v.boolean() },
  handler: async (ctx, { userId: other, accept }) => {
    const userId = await requireUser(ctx);
    const l = await link(ctx, userId, other);
    if (!l || l.status !== 'pending' || l.from === userId) return;
    if (accept) await ctx.db.patch(l._id, { status: 'accepted', at: Date.now() });
    else await ctx.db.delete(l._id);
  },
});

// Desfaz a amizade (ou cancela um pedido enviado).
export const remove = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId: other }) => {
    const userId = await requireUser(ctx);
    const l = await link(ctx, userId, other);
    if (l) await ctx.db.delete(l._id);
  },
});

// O perfil de alguém (o meu ou de outra pessoa), com os números e a amizade.
export const profile = query({
  args: { userId: v.optional(v.id('users')), username: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    let u: Doc<'users'> | null = null;
    if (args.userId) u = await ctx.db.get(args.userId);
    else if (args.username) {
      const handle = args.username.replace(/^@/, '').toLowerCase();
      u = await ctx.db
        .query('users')
        .withIndex('username', (q) => q.eq('username', handle))
        .unique();
    } else u = await ctx.db.get(me);
    if (!u) return null;
    const stats = await statsOf(ctx, u._id);
    const isMe = u._id === me;
    const l = isMe ? null : await link(ctx, me, u._id);
    const friendCount = (await allLinks(ctx, u._id)).filter((x) => x.status === 'accepted').length;
    return {
      ...card(u),
      isMe,
      stats,
      level: levelOf(stats),
      medals: medalsOf(stats),
      friends: friendCount,
      live: await liveGameOf(ctx, u._id),
      status: isMe ? 'me' : l ? (l.status === 'accepted' ? 'friend' : l.from === me ? 'sent' : 'received') : 'none',
      together: isMe ? null : await together(ctx, me, u._id),
    };
  },
});
