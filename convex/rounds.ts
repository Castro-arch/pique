import { ConvexError, v } from 'convex/values';

import { notify } from './alerts';
import { recordRound } from './profile';
import { isChoosing } from './games';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, mutation, type MutationCtx } from './_generated/server';
import {
  BOOST_EVERY_MIN,
  BOOSTS_PER_WAVE,
  DESPISTE_M,
  distanceM,
  features,
  gamePlayers,
  lastPosition,
  MIN,
  MIN_ZONE_RADIUS,
  offsetM,
  requireHost,
  requireMember,
  SHOUTS_PER_ROUND,
  systemMessage,
} from './lib';

// Cada evento agendado leva o número da rodada: se a rodada mudou
// (revanche) ou acabou, o evento velho é ignorado.
const roundArgs = { gameId: v.id('games'), round: v.number() };

// Separa os jogadores ainda na rodada por papel, para os avisos.
async function inRound(ctx: MutationCtx, gameId: Id<'games'>) {
  const all = (await gamePlayers(ctx, gameId)).filter((p) => p.state !== 'left' && p.role);
  return {
    all,
    runners: all.filter((p) => p.role === 'runner' && p.state === 'active'),
    hunters: all.filter((p) => p.role === 'hunter' && p.state === 'active'),
  };
}


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

// O que precisa estar certo para começar (ou girar a roleta).
async function readyToStart(ctx: MutationCtx, gameId: Id<'games'>) {
  const { userId, game } = await requireMember(ctx, gameId);
  requireHost(game, userId);
  if (game.status === 'headstart' || game.status === 'hunt') throw new ConvexError('A rodada já começou.');
  if (!game.zone) throw new ConvexError('Marque a zona de jogo antes de começar.');
  const players = (await gamePlayers(ctx, gameId)).filter((p) => p.state !== 'left');
  if (players.length < 2) throw new ConvexError('Precisa de pelo menos 2 pessoas para jogar.');
  // Todo mundo precisa estar pronto; senão quem estava fora fica para trás.
  const choosing = players.filter((p) => isChoosing(p, game));
  if (choosing.length) {
    const names = choosing.map((p) => p.name).join(', ');
    throw new ConvexError(`Esperando ${names} ficar${choosing.length > 1 ? 'em' : ''} pronto${choosing.length > 1 ? 's' : ''}.`);
  }
  return { game, players };
}

// Plano da roleta: a luz passa pelos celulares na ordem da roda, cada passo
// mais devagar, e para no caçador sorteado. Com mais de um caçador ela gira
// de novo, pulando quem já foi escolhido.
export const DRAW_PAUSE_MS = 2200;
export function planDraw(order: Id<'players'>[], wanted: number, t0: number) {
  const count = Math.max(1, Math.min(wanted, order.length - 1));
  const hunters = shuffle(order).slice(0, count);
  const steps: { at: number; p: Id<'players'> }[] = [];
  const stops: number[] = [];
  let pool = [...order];
  let t = t0;
  hunters.forEach((target, k) => {
    const n = k === 0 ? 18 : 13;
    let d = k === 0 ? 80 : 70;
    const grow = k === 0 ? 1.12 : 1.15;
    const ti = pool.indexOf(target);
    const s0 = (((ti - n) % pool.length) + pool.length) % pool.length;
    for (let i = 0; i <= n; i++) {
      steps.push({ at: Math.round(t), p: pool[(s0 + i) % pool.length] });
      if (i < n) {
        t += d;
        d *= grow;
      }
    }
    stops.push(steps.length - 1);
    // Entre um caçador e outro todo mundo vê onde parou; depois do último a
    // rodada começa logo (cada um já foi para a própria revelação).
    t += k < hunters.length - 1 ? DRAW_PAUSE_MS : 800;
    pool = pool.filter((p) => p !== target);
  });
  return { startAt: t0, endAt: Math.round(t), order, steps, stops, hunters };
}

// 15.1 "Girar a roleta": só o anfitrião, com todo mundo pronto.
export const spin = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const { game, players } = await readyToStart(ctx, gameId);
    if (game.draw && game.draw.endAt > Date.now()) throw new ConvexError('A roleta já está girando.');
    const order = [...players].sort((a, b) => a.joinedAt - b.joinedAt).map((p) => p._id);
    // 1,2 s de folga para todos os celulares receberem o plano antes da luz sair.
    const plan = planDraw(order, game.rules.hunters, Date.now() + 1200);
    await ctx.db.patch(gameId, { draw: plan });
    await ctx.scheduler.runAt(plan.endAt, internal.rounds.fromDraw, { gameId, endAt: plan.endAt });
    return { endAt: plan.endAt };
  },
});

// A roleta parou de vez: começa a rodada com os caçadores dela.
export const fromDraw = internalMutation({
  args: { gameId: v.id('games'), endAt: v.number() },
  handler: async (ctx, { gameId, endAt }) => {
    const game = await ctx.db.get(gameId);
    if (!game?.draw || game.draw.endAt !== endAt) return;
    if (game.status !== 'lobby' && game.status !== 'ended') return;
    const hunters = new Set(game.draw.hunters);
    const players = (await gamePlayers(ctx, gameId)).filter((p) => p.state !== 'left');
    await ctx.db.patch(gameId, { draw: undefined });
    // Quem entrou durante o giro não estava na roda: vai de corredor.
    const roles = players.map((p) => ({ id: p._id, role: hunters.has(p._id) ? ('hunter' as const) : ('runner' as const) }));
    if (!roles.some((r) => r.role === 'hunter') || roles.every((r) => r.role === 'hunter')) return;
    await beginRound(ctx, game, roles);
  },
});

export const start = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const { game, players } = await readyToStart(ctx, gameId);
    return beginRound(ctx, game, assignRoles(players, game.rules.hunters));
  },
});

async function beginRound(ctx: MutationCtx, game: Doc<'games'>, roles: { id: Id<'players'>; role: 'hunter' | 'runner' }[]) {
  const gameId = game._id;
  if (game.status === 'headstart' || game.status === 'hunt') throw new ConvexError('A rodada já começou.');
  const round = game.round + 1;
  for (const { id, role } of roles) {
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
      shoutsLeft: role === 'hunter' ? SHOUTS_PER_ROUND : undefined,
      shoutedAt: undefined,
      revealed: undefined,
      revealUntil: undefined,
      nextPing: undefined,
      shieldUntil: undefined,
      jail: undefined,
      rescue: undefined,
    });
  }
  await clearBoosts(ctx, gameId);

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
  const who = await inRound(ctx, gameId);
  await notify(ctx, who.runners, 'start', 'A rodada começou: você corre', `Você tem ${r.headStartMin} min de vantagem. Suma!`);
  await notify(ctx, who.hunters, 'start', 'A rodada começou: você caça', `Os corredores têm ${r.headStartMin} min de vantagem. Espere parado.`);
  return { round };
}

export const headStartOver = internalMutation({
  args: roundArgs,
  handler: async (ctx, { gameId, round }) => {
    const game = await liveGame(ctx, gameId, round);
    if (!game || game.status !== 'headstart') return;
    await ctx.db.patch(gameId, { status: 'hunt' });
    await systemMessage(ctx, gameId, 'Acabou a vantagem. Os caçadores foram liberados.');
    const who = await inRound(ctx, gameId);
    await notify(ctx, who.hunters, 'hunt', 'Caçada liberada!', 'Acabou a vantagem. Vai atrás deles.');
    await notify(ctx, who.runners, 'hunt', 'Os caçadores foram liberados', 'Fique escondido. O primeiro ping vem logo.');
    if (features(game.rules).boosts) await ctx.scheduler.runAfter(MIN, internal.rounds.spawnBoosts, { gameId, round });
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
      // Sombra: some deste ping. Despiste: o ping sai a 60 m do lugar certo.
      if (p.nextPing === 'sombra') {
        await ctx.db.patch(p._id, { ping: undefined, nextPing: undefined });
        continue;
      }
      const at = p.nextPing === 'despiste' ? offsetM(pos, DESPISTE_M, Math.random() * 2 * Math.PI) : pos;
      await ctx.db.patch(p._id, { ping: { lat: at.lat, lng: at.lng, at: now }, nextPing: undefined });
      lit++;
    }
    const next = now + game.rules.pingEveryMin * MIN;
    const hasNext = next < (game.endsAt ?? 0);
    await ctx.db.patch(gameId, { lastPingAt: now, nextPingAt: hasNext ? next : undefined });
    if (hasNext) await ctx.scheduler.runAt(next, internal.rounds.ping, { gameId, round });
    await systemMessage(ctx, gameId, `Ping! ${lit} ${lit === 1 ? 'corredor acendeu' : 'corredores acenderam'} no mapa.`, 'hunter');
    await systemMessage(ctx, gameId, 'Ping! Sua posição foi enviada. Se mexa.', 'runner');
    const who = await inRound(ctx, gameId);
    await notify(ctx, who.runners, 'ping', 'Ping!', 'Sua posição foi para os caçadores. Se mexa.');
    await notify(ctx, who.hunters, 'ping', 'Ping!', `${lit} ${lit === 1 ? 'corredor acendeu' : 'corredores acenderam'} no mapa.`);
  },
});

// ── Boosts ─────────────────────────────────────────────────────────────

const KINDS = [
  ['despiste', 0.45],
  ['sombra', 0.35],
  ['escudo', 0.2],
] as const;
function randomKind() {
  let r = Math.random();
  for (const [kind, w] of KINDS) if ((r -= w) < 0) return kind;
  return 'despiste' as const;
}

async function clearBoosts(ctx: MutationCtx, gameId: Id<'games'>) {
  for (const state of ['map', 'held'] as const) {
    for (const b of await ctx.db.query('boosts').withIndex('by_game', (q) => q.eq('gameId', gameId).eq('state', state)).collect()) {
      await ctx.db.delete(b._id);
    }
  }
}

// Uma onda: some o que ninguém pegou e aparecem 3 boosts novos dentro da zona.
export const spawnBoosts = internalMutation({
  args: { ...roundArgs, waited: v.optional(v.number()) },
  handler: async (ctx, { gameId, round, waited = 0 }) => {
    const game = await liveGame(ctx, gameId, round);
    if (!game || game.status !== 'hunt' || !game.zone) return;
    // As ruas ainda não chegaram (a busca está tentando de novo): espera um
    // pouco em vez de soltar boosts dentro de quarteirão. Depois de ~3 min, solta assim mesmo.
    if (!game.streets?.points.length && waited < 6) {
      if (waited === 0) await ctx.scheduler.runAfter(0, internal.streets.load, { gameId, ...game.zone });
      await ctx.scheduler.runAfter(30_000, internal.rounds.spawnBoosts, { gameId, round, waited: waited + 1 });
      return;
    }
    for (const b of await ctx.db.query('boosts').withIndex('by_game', (q) => q.eq('gameId', gameId).eq('state', 'map')).collect()) {
      await ctx.db.delete(b._id);
    }
    const count = BOOSTS_PER_WAVE[game.rules.boostAmount ?? 'normal'];
    // Em cima das ruas (da busca no OpenStreetMap), dentro da zona de agora
    // (ela pode ter encolhido). Sem ruas, qualquer lugar da zona.
    const zone = game.zone;
    const onStreet = shuffle((game.streets?.points ?? []).filter((p) => distanceM(p, zone) <= zone.radius * 0.9));
    for (let i = 0; i < count; i++) {
      // sqrt espalha por igual na área, e não amontoado no centro.
      const at = onStreet[i] ?? offsetM(zone, zone.radius * 0.85 * Math.sqrt(Math.random()), Math.random() * 2 * Math.PI);
      await ctx.db.insert('boosts', { gameId, round, kind: randomKind(), ...at, state: 'map' });
    }
    await systemMessage(ctx, gameId, `${count} boosts apareceram. Você guarda até 2; quanto mais forte, mais tempo fica visível ao pegar.`, 'runner');
    const next = Date.now() + BOOST_EVERY_MIN * MIN;
    if (next < (game.endsAt ?? 0)) await ctx.scheduler.runAt(next, internal.rounds.spawnBoosts, { gameId, round });
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
    await notify(ctx, (await inRound(ctx, gameId)).runners, 'shrink', 'A zona vai encolher', `Em 1 min ela fica com ${next * 2} m. Fique dentro.`);
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
    await notify(ctx, [p], 'exposed', 'Os caçadores te veem ao vivo', 'Você está fora da zona há 30 s. Volte!');
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
    await recordRound(ctx, game, players, winner, now);
    await deleteAudio(ctx, gameId);
    await notify(
      ctx,
      players.filter((p) => p.role),
      'end',
      winner === 'runner' ? 'Fim da rodada: corredores venceram' : 'Fim da rodada: caçadores venceram',
      winner === 'runner' ? `${free} ${free === 1 ? 'corredor escapou' : 'corredores escaparam'}.` : 'Pegaram todo mundo.',
    );
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
    await clearBoosts(ctx, gameId);
    for (const b of await ctx.db.query('boosts').withIndex('by_game', (q) => q.eq('gameId', gameId).eq('state', 'used')).collect()) {
      await ctx.db.delete(b._id);
    }
    for (const table of ['messages', 'captures', 'positions', 'alerts', 'players'] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex('by_game', (q) => q.eq('gameId', gameId))
        .collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }
    if (await ctx.db.get(gameId)) await ctx.db.delete(gameId);
  },
});
