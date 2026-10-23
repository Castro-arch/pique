import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { CAPTURE_CONFIRM_MS, distanceM, FRESH_POSITION_MS, gamePlayers, HEARTBEAT_M, lastPosition, requireMember, SHOUT_M, SHOUTS_PER_ROUND, systemMessage } from './lib';
import { markOutOfZone } from './rounds';

const MAX_ACCURACY_M = 30; // leitura pior que isso é descartada
const MAX_SPEED_MS = 35 / 3.6; // 35 km/h: acima disso é salto de GPS
const MIN_INTERVAL_MS = 2_000;
const MAX_CAPTURE_DISTANCE_M = 50;

const playing = (g: Doc<'games'>) => g.status === 'headstart' || g.status === 'hunt';

// O celular só manda a posição. Zona, visibilidade e pega são decididas aqui.
export const sendPosition = mutation({
  args: { gameId: v.id('games'), lat: v.number(), lng: v.number(), accuracy: v.number(), mocked: v.optional(v.boolean()) },
  handler: async (ctx, { gameId, lat, lng, accuracy, mocked }) => {
    const { game, me } = await requireMember(ctx, gameId);
    if (!playing(game) || me.state !== 'active') return { accepted: false as const, reason: 'not_playing' };
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new ConvexError('Posição inválida.');
    if (accuracy > MAX_ACCURACY_M) return { accepted: false as const, reason: 'accuracy' };

    const now = Date.now();
    const prev = await lastPosition(ctx, me._id);
    const flags = new Set(me.flags ?? []);
    if (mocked) flags.add('mock');

    let moved = 0;
    if (prev) {
      if (now - prev.at < MIN_INTERVAL_MS) return { accepted: false as const, reason: 'too_soon' };
      moved = distanceM(prev, { lat, lng });
      if (moved > 100 && moved / ((now - prev.at) / 1000) > MAX_SPEED_MS) {
        flags.add('jump');
        await ctx.db.patch(me._id, { flags: [...flags] });
        return { accepted: false as const, reason: 'jump' };
      }
      await ctx.db.patch(prev._id, { lat, lng, accuracy, at: now });
    } else {
      await ctx.db.insert('positions', { gameId, playerId: me._id, lat, lng, accuracy, at: now });
    }
    await ctx.db.patch(me._id, { distanceM: (me.distanceM ?? 0) + (moved > 5 ? moved : 0), flags: flags.size ? [...flags] : undefined });

    // Zona: só vale para corredor. Fora por 30 s, fica visível ao vivo.
    if (me.role === 'runner' && game.zone) {
      const out = distanceM({ lat, lng }, game.zone) > game.zone.radius;
      if (out && !me.outOfZoneSince) await markOutOfZone(ctx, me, now);
      if (!out && me.outOfZoneSince) await ctx.db.patch(me._id, { outOfZoneSince: undefined, exposed: undefined });
    }
    return { accepted: true as const };
  },
});

type Seen = {
  id: Id<'players'>;
  name: string;
  role: 'runner' | 'hunter';
  state: Doc<'players'>['state'];
  isMe: boolean;
  kind: 'live' | 'ping';
  lat: number;
  lng: number;
  at: number;
};

// A regra de visibilidade do documento, aplicada no servidor:
// caçador vê caçadores ao vivo e corredores no último ping (ou ao vivo se
// fora da zona há 30 s); corredor vê o próprio time e nunca os caçadores.
export const view = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const { game, me } = await requireMember(ctx, gameId);
    const players = (await gamePlayers(ctx, gameId)).filter((p) => p.state !== 'left' && p.role);
    const iHunt = me.role === 'hunter' && me.state === 'active';
    const seen: Seen[] = [];

    for (const p of players) {
      const role = p.role!;
      const isMe = p._id === me._id;
      const base = { id: p._id, name: p.name, role, state: p.state, isMe };
      // Corredor e espectador nunca veem caçadores.
      if (!isMe && !iHunt && role === 'hunter') continue;
      // Caçador vê corredor no último ping, a não ser que ele esteja exposto.
      if (!isMe && iHunt && role === 'runner' && !(p.exposed && p.state === 'active')) {
        if (p.ping) seen.push({ ...base, kind: 'ping', ...p.ping });
        continue;
      }
      // O resto (eu, meu time, corredor exposto) aparece ao vivo.
      const pos = await lastPosition(ctx, p._id);
      if (pos) seen.push({ ...base, kind: 'live', lat: pos.lat, lng: pos.lng, at: pos.at });
    }

    const runners = players.filter((p) => p.role === 'runner');
    const heartbeat = game.status === 'hunt' && me.role === 'runner' && me.state === 'active'
      ? await hunterWithin(ctx, players, me._id, HEARTBEAT_M)
      : false;
    const pending = await ctx.db
      .query('captures')
      .withIndex(me.role === 'runner' ? 'by_runner' : 'by_hunter', (q) =>
        me.role === 'runner' ? q.eq('runnerId', me._id).eq('status', 'pending') : q.eq('hunterId', me._id).eq('status', 'pending'),
      )
      .first();
    const lastDisputed = me.role === 'hunter'
      ? await ctx.db.query('captures').withIndex('by_hunter', (q) => q.eq('hunterId', me._id).eq('status', 'disputed')).order('desc').first()
      : null;

    return {
      game: {
        code: game.code,
        status: game.status,
        round: game.round,
        zone: game.zone ?? null,
        nextZoneRadius: game.nextZoneRadius ?? null,
        shrinkAt: game.shrinkAt ?? null,
        headStartEndsAt: game.headStartEndsAt ?? null,
        endsAt: game.endsAt ?? null,
        nextPingAt: game.nextPingAt ?? null,
        lastPingAt: game.lastPingAt ?? null,
        pingEveryMin: game.rules.pingEveryMin,
        winner: game.winner ?? null,
        endedReason: game.endedReason ?? null,
        startedAt: game.startedAt ?? null,
        headStartMin: game.rules.headStartMin,
        endedAt: game.endedAt ?? null,
      },
      me: {
        id: me._id,
        role: me.role ?? null,
        state: me.state,
        outOfZoneSince: me.outOfZoneSince ?? null,
        exposed: !!me.exposed,
        distanceM: Math.round(me.distanceM ?? 0),
        caughtAt: me.caughtAt ?? null,
        catches: players.filter((p) => p.caughtBy === me._id).length,
        // Só o corredor sabe que tem caçador perto, e não de que lado.
        heartbeat,
        shoutsLeft: me.role === 'hunter' ? (me.shoutsLeft ?? SHOUTS_PER_ROUND) : null,
        shoutedAt: me.role === 'runner' ? (me.shoutedAt ?? null) : null,
      },
      runners: { total: runners.length, free: runners.filter((p) => p.state === 'active').length },
      people: seen,
      capture: pending
        ? { id: pending._id, expiresAt: pending.expiresAt, other: (await ctx.db.get(me.role === 'runner' ? pending.hunterId : pending.runnerId))?.name ?? '' }
        : null,
      disputed: lastDisputed
        ? { id: lastDisputed._id, distanceM: lastDisputed.distanceM ?? null, other: (await ctx.db.get(lastDisputed.runnerId))?.name ?? '' }
        : null,
    };
  },
});

// ── Coração acelerado e grito ──────────────────────────────────────────

// Algum caçador ativo, com posição recente, a até `m` metros do jogador?
async function hunterWithin(ctx: QueryCtx, players: Doc<'players'>[], runnerId: Id<'players'>, m: number) {
  const mine = await lastPosition(ctx, runnerId);
  if (!mine || Date.now() - mine.at > FRESH_POSITION_MS) return false;
  for (const h of players) {
    if (h.role !== 'hunter' || h.state !== 'active') continue;
    const pos = await lastPosition(ctx, h._id);
    if (pos && Date.now() - pos.at <= FRESH_POSITION_MS && distanceM(pos, mine) <= m) return true;
  }
  return false;
}

// Caçador grita: o celular do corredor mais perto, a até 60 m, toca por 2 s.
// Se ninguém estiver no alcance, o grito não gasta.
export const shout = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const { game, me } = await requireMember(ctx, gameId);
    if (game.status !== 'hunt') throw new ConvexError('Só dá para gritar depois da vantagem.');
    if (me.role !== 'hunter' || me.state !== 'active') throw new ConvexError('Só caçadores gritam.');
    const left = me.shoutsLeft ?? SHOUTS_PER_ROUND;
    if (left <= 0) throw new ConvexError('Seus gritos acabaram nesta rodada.');
    const mine = await lastPosition(ctx, me._id);
    if (!mine || Date.now() - mine.at > FRESH_POSITION_MS) throw new ConvexError('Esperando o GPS achar você.');

    let target: { id: Id<'players'>; d: number } | null = null;
    for (const p of await gamePlayers(ctx, gameId)) {
      if (p.role !== 'runner' || p.state !== 'active') continue;
      const pos = await lastPosition(ctx, p._id);
      if (!pos || Date.now() - pos.at > FRESH_POSITION_MS) continue;
      const d = distanceM(pos, mine);
      if (d <= SHOUT_M && (!target || d < target.d)) target = { id: p._id, d };
    }
    if (!target) return { hit: false as const, left };
    await ctx.db.patch(target.id, { shoutedAt: Date.now() });
    await ctx.db.patch(me._id, { shoutsLeft: left - 1 });
    return { hit: true as const, left: left - 1 };
  },
});

// ── Pega ───────────────────────────────────────────────────────────────

async function confirmCapture(ctx: MutationCtx, capture: Doc<'captures'>) {
  const runner = await ctx.db.get(capture.runnerId);
  const hunter = await ctx.db.get(capture.hunterId);
  if (!runner || runner.state !== 'active') return;
  await ctx.db.patch(capture._id, { status: 'confirmed' });
  await caught(ctx, runner, hunter);
}

async function caught(ctx: MutationCtx, runner: Doc<'players'>, hunter: Doc<'players'> | null) {
  await ctx.db.patch(runner._id, { state: 'caught', caughtAt: Date.now(), caughtBy: hunter?._id, exposed: undefined, outOfZoneSince: undefined });
  const free = (await gamePlayers(ctx, runner.gameId)).filter((p) => p.role === 'runner' && p.state === 'active').length;
  const who = hunter ? `${hunter.name} pegou ${runner.name}` : `${runner.name} foi pego`;
  await systemMessage(ctx, runner.gameId, `${who}. ${free === 1 ? 'Resta 1 corredor' : `Restam ${free} corredores`}.`);
  const game = await ctx.db.get(runner.gameId);
  if (game) await ctx.runMutation(internal.rounds.checkEnd, { gameId: game._id, round: game.round });
}

// Caçador: "Marquei um corredor". O corredor tem 60 s para confirmar.
export const markCapture = mutation({
  args: { gameId: v.id('games'), runnerId: v.id('players') },
  handler: async (ctx, { gameId, runnerId }) => {
    const { game, me } = await requireMember(ctx, gameId);
    if (game.status !== 'hunt') throw new ConvexError('Só dá para pegar depois da vantagem.');
    if (me.role !== 'hunter' || me.state !== 'active') throw new ConvexError('Só caçadores pegam.');
    const runner = await ctx.db.get(runnerId);
    if (!runner || runner.gameId !== gameId || runner.role !== 'runner' || runner.state !== 'active') {
      throw new ConvexError('Esse corredor não está mais no jogo.');
    }
    const open = await ctx.db.query('captures').withIndex('by_runner', (q) => q.eq('runnerId', runnerId).eq('status', 'pending')).first();
    if (open) return open._id;

    // Se os dois têm posição, o servidor confere a distância.
    const [a, b] = [await lastPosition(ctx, me._id), await lastPosition(ctx, runnerId)];
    const dist = a && b ? Math.round(distanceM(a, b)) : undefined;
    if (dist !== undefined && dist > MAX_CAPTURE_DISTANCE_M) throw new ConvexError(`Vocês estão a ${dist} m. Chegue mais perto.`);

    const now = Date.now();
    const id = await ctx.db.insert('captures', { gameId, hunterId: me._id, runnerId, status: 'pending', distanceM: dist, createdAt: now, expiresAt: now + CAPTURE_CONFIRM_MS });
    await ctx.scheduler.runAfter(CAPTURE_CONFIRM_MS, internal.play.expireCapture, { captureId: id });
    return id;
  },
});

// Corredor responde: "fui pego" ou "não fui".
export const answerCapture = mutation({
  args: { captureId: v.id('captures'), caught: v.boolean() },
  handler: async (ctx, { captureId, caught: yes }) => {
    const capture = await ctx.db.get(captureId);
    if (!capture || capture.status !== 'pending') return;
    const { me } = await requireMember(ctx, capture.gameId);
    if (capture.runnerId !== me._id) throw new ConvexError('Essa pega não é sua.');
    if (yes) await confirmCapture(ctx, capture);
    else await ctx.db.patch(captureId, { status: 'disputed' });
  },
});

export const cancelCapture = mutation({
  args: { captureId: v.id('captures') },
  handler: async (ctx, { captureId }) => {
    const capture = await ctx.db.get(captureId);
    if (!capture || (capture.status !== 'pending' && capture.status !== 'disputed')) return;
    const { me } = await requireMember(ctx, capture.gameId);
    if (capture.hunterId !== me._id) throw new ConvexError('Essa pega não é sua.');
    await ctx.db.patch(captureId, { status: 'cancelled' });
  },
});

// Sem resposta em 60 s conta como pego.
export const expireCapture = internalMutation({
  args: { captureId: v.id('captures') },
  handler: async (ctx, { captureId }) => {
    const capture = await ctx.db.get(captureId);
    if (capture?.status === 'pending') await confirmCapture(ctx, capture);
  },
});

// Corredor: "Fui pego" por conta própria (sistema de honra).
export const reportCaught = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const { game, me } = await requireMember(ctx, gameId);
    if (!playing(game) || me.role !== 'runner' || me.state !== 'active') return;
    await caught(ctx, me, null);
  },
});
