import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, mutation, type MutationCtx } from './_generated/server';
import { distanceM, gamePlayers, lastPosition, MIN, MIN_ZONE_RADIUS, requireHost, requireMember, systemMessage } from './lib';

// Cada evento agendado leva o número da rodada: se a rodada mudou
// (revanche) ou acabou, o evento velho é ignorado.
const roundArgs = { gameId: v.id('games'), round: v.number() };

async function liveGame(ctx: MutationCtx, gameId: Id<'games'>, round: number) {
  const game = await ctx.db.get(gameId);
  if (!game || game.round !== round || game.status === 'ended' || game.status === 'lobby') return null;
  return game;
}

function shuffle<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Sorteio: respeita quem escolheu caçador; o sorteio completa o time menor.
export function assignRoles(players: Pick<Doc<'players'>, '_id' | 'side'>[], wanted: number) {
  const hunters = Math.max(1, Math.min(wanted, players.length - 1));
  const byChoice = (s: string) => shuffle(players.filter((p) => p.side === s));
  const order = [...byChoice('hunter'), ...byChoice('draw'), ...byChoice('runner')];
  const hunterIds = new Set(order.slice(0, hunters).map((p) => p._id));
  return players.map((p) => ({ id: p._id, role: hunterIds.has(p._id) ? ('hunter' as const) : ('runner' as const) }));
}

export const start = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const { userId, game } = await requireMember(ctx, gameId);
    requireHost(game, userId);
    if (game.status === 'headstart' || game.status === 'hunt') throw new ConvexError('A rodada já começou.');
    if (!game.zone) throw new ConvexError('Marque a zona de jogo antes de começar.');
    const players = (await gamePlayers(ctx, gameId)).filter((p) => p.state !== 'left');
    if (players.length < 2) throw new ConvexError('Precisa de pelo menos 2 pessoas para jogar.');

    const round = game.round + 1;
    for (const { id, role } of assignRoles(players, game.rules.hunters)) {
      await ctx.db.patch(id, {
        role,
        state: 'active',
        ready: false,
        ping: undefined,
        outOfZoneSince: undefined,
        exposed: undefined,
        caughtAt: undefined,
        caughtBy: undefined,
        distanceM: 0,
      });
    }

    const now = Date.now();
    const r = game.rules;
    const headStartEndsAt = now + r.headStartMin * MIN;
    const endsAt = headStartEndsAt + r.durationMin * MIN;
    const nextPingAt = headStartEndsAt + r.pingEveryMin * MIN;
    await ctx.db.patch(gameId, {
      status: 'headstart',
      round,
      startedAt: now,
      headStartEndsAt,
      endsAt,
      nextPingAt,
      lastPingAt: undefined,
      shrinkAt: undefined,
      nextZoneRadius: undefined,
      endedAt: undefined,
      winner: undefined,
      endedReason: undefined,
    });

    await ctx.scheduler.runAt(headStartEndsAt, internal.rounds.headStartOver, { gameId, round });
    if (nextPingAt < endsAt) await ctx.scheduler.runAt(nextPingAt, internal.rounds.ping, { gameId, round });
    if (r.shrink) {
      const warnAt = headStartEndsAt + r.shrinkEveryMin * MIN - MIN;
      if (warnAt < endsAt) await ctx.scheduler.runAt(warnAt, internal.rounds.shrinkWarn, { gameId, round });
    }
    await ctx.scheduler.runAt(endsAt, internal.rounds.end, { gameId, round, reason: 'time' });
    await systemMessage(ctx, gameId, `Os corredores têm ${r.headStartMin} min de vantagem.`);
    return { round };
  },
});

export const headStartOver = internalMutation({
  args: roundArgs,
  handler: async (ctx, { gameId, round }) => {
    const game = await liveGame(ctx, gameId, round);
    if (!game || game.status !== 'headstart') return;
    await ctx.db.patch(gameId, { status: 'hunt' });
    await systemMessage(ctx, gameId, 'Acabou a vantagem. Os caçadores foram liberados.');
  },
});

// Ping: grava onde cada corredor estava agora. É isso que os caçadores veem.
export const ping = internalMutation({
  args: roundArgs,
  handler: async (ctx, { gameId, round }) => {
    const game = await liveGame(ctx, gameId, round);
    if (!game) return;
    const now = Date.now();
    let lit = 0;
    for (const p of await gamePlayers(ctx, gameId)) {
      if (p.role !== 'runner' || p.state !== 'active') continue;
      const pos = await lastPosition(ctx, p._id);
      if (!pos) continue;
      await ctx.db.patch(p._id, { ping: { lat: pos.lat, lng: pos.lng, at: now } });
      lit++;
    }
    const next = now + game.rules.pingEveryMin * MIN;
    const hasNext = next < (game.endsAt ?? 0);
    await ctx.db.patch(gameId, { lastPingAt: now, nextPingAt: hasNext ? next : undefined });
    if (hasNext) await ctx.scheduler.runAt(next, internal.rounds.ping, { gameId, round });
    await systemMessage(ctx, gameId, `Ping! ${lit} ${lit === 1 ? 'corredor acendeu' : 'corredores acenderam'} no mapa.`, 'hunter');
    await systemMessage(ctx, gameId, 'Ping! Sua posição foi enviada. Se mexa.', 'runner');
  },
});

// 1 min antes de encolher: anuncia a zona nova.
export const shrinkWarn = internalMutation({
  args: roundArgs,
  handler: async (ctx, { gameId, round }) => {
    const game = await liveGame(ctx, gameId, round);
    if (!game?.zone || game.zone.radius <= MIN_ZONE_RADIUS) return;
    const next = Math.max(MIN_ZONE_RADIUS, Math.round(game.zone.radius * 0.72));
    const at = Date.now() + MIN;
    await ctx.db.patch(gameId, { nextZoneRadius: next, shrinkAt: at });
    await ctx.scheduler.runAt(at, internal.rounds.shrink, { gameId, round });
    await systemMessage(ctx, gameId, `A zona encolhe em 1 min: de ${game.zone.radius * 2} m para ${next * 2} m.`);
  },
});

export const shrink = internalMutation({
  args: roundArgs,
  handler: async (ctx, { gameId, round }) => {
    const game = await liveGame(ctx, gameId, round);
    if (!game?.zone || !game.nextZoneRadius) return;
    const zone = { ...game.zone, radius: game.nextZoneRadius };
    await ctx.db.patch(gameId, { zone, nextZoneRadius: undefined, shrinkAt: undefined });

    // Quem ficou do lado de fora começa a contar os 30 s.
    for (const p of await gamePlayers(ctx, gameId)) {
      if (p.role !== 'runner' || p.state !== 'active' || p.outOfZoneSince) continue;
      const pos = await lastPosition(ctx, p._id);
      if (pos && distanceM(pos, zone) > zone.radius) await markOutOfZone(ctx, p, Date.now());
    }

    const warnAt = Date.now() + game.rules.shrinkEveryMin * MIN - MIN;
    if (zone.radius > MIN_ZONE_RADIUS && warnAt < (game.endsAt ?? 0)) {
      await ctx.scheduler.runAt(warnAt, internal.rounds.shrinkWarn, { gameId, round });
    }
  },
});

export async function markOutOfZone(ctx: MutationCtx, p: Doc<'players'>, since: number) {
  await ctx.db.patch(p._id, { outOfZoneSince: since });
  await ctx.scheduler.runAfter(30_000, internal.rounds.expose, { playerId: p._id, since });
}

// 30 s fora da zona: os caçadores passam a ver o corredor ao vivo.
export const expose = internalMutation({
  args: { playerId: v.id('players'), since: v.number() },
  handler: async (ctx, { playerId, since }) => {
    const p = await ctx.db.get(playerId);
    if (!p || p.outOfZoneSince !== since || p.state !== 'active') return;
    await ctx.db.patch(playerId, { exposed: true });
    await systemMessage(ctx, p.gameId, `${p.name} saiu da zona e está visível ao vivo.`, 'hunter');
  },
});

// Acabou? Sem corredores livres, os caçadores vencem na hora.
export const checkEnd = internalMutation({
  args: roundArgs,
  handler: async (ctx, { gameId, round }) => {
    const game = await liveGame(ctx, gameId, round);
    if (!game) return;
    const players = await gamePlayers(ctx, gameId);
    const runners = players.filter((p) => p.role === 'runner' && p.state === 'active');
    const hunters = players.filter((p) => p.role === 'hunter' && p.state === 'active');
    if (runners.length === 0) await ctx.runMutation(internal.rounds.end, { gameId, round, reason: 'all_tagged' });
    else if (hunters.length === 0) await ctx.runMutation(internal.rounds.end, { gameId, round, reason: 'abandoned' });
  },
});

export const end = internalMutation({
  args: { ...roundArgs, reason: v.union(v.literal('time'), v.literal('all_tagged'), v.literal('abandoned')) },
  handler: async (ctx, { gameId, round, reason }) => {
    const game = await liveGame(ctx, gameId, round);
    if (!game) return;
    const players = await gamePlayers(ctx, gameId);
    const free = players.filter((p) => p.role === 'runner' && p.state === 'active').length;
    const winner = reason === 'all_tagged' ? 'hunter' : free > 0 ? 'runner' : 'hunter';
    const now = Date.now();

    await ctx.db.patch(gameId, { status: 'ended', endedAt: now, winner, endedReason: reason, nextPingAt: undefined, shrinkAt: undefined });
    for (const c of await ctx.db.query('captures').withIndex('by_game', (q) => q.eq('gameId', gameId)).collect()) {
      if (c.status === 'pending') await ctx.db.patch(c._id, { status: 'cancelled' });
    }
    await ctx.db.insert('match_stats', {
      gameId,
      round,
      players: players.filter((p) => p.state !== 'left').length,
      durationMin: Math.round((now - (game.startedAt ?? now)) / MIN),
      endedReason: reason,
      winner,
      at: now,
    });
    await deleteAudio(ctx, gameId);
    await systemMessage(ctx, gameId, winner === 'runner' ? `Fim! ${free} ${free === 1 ? 'corredor escapou' : 'corredores escaparam'}.` : 'Fim! Os caçadores pegaram todo mundo.');
  },
});

// Os áudios do Radio só existem durante a rodada.
async function deleteAudio(ctx: MutationCtx, gameId: Id<'games'>) {
  for (const m of await ctx.db.query('messages').withIndex('by_game', (q) => q.eq('gameId', gameId)).collect()) {
    if (m.audioId) {
      await ctx.storage.delete(m.audioId);
      await ctx.db.delete(m._id);
    }
  }
}

// 7 dias depois: apaga a partida e tudo ligado a ela (fica só match_stats).
export const cleanup = internalMutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    await deleteAudio(ctx, gameId);
    for (const table of ['messages', 'captures', 'positions', 'players'] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex('by_game', (q) => q.eq('gameId', gameId))
        .collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }
    if (await ctx.db.get(gameId)) await ctx.db.delete(gameId);
  },
});
