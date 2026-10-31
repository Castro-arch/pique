import { ConvexError, v } from 'convex/values';

import { notify } from './alerts';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import {
  BOOST_NAME,
  BOOST_PICK_M,
  BOOST_REVEAL_S,
  BOOST_SLOTS,
  CAPTURE_CONFIRM_MS,
  distanceM,
  features,
  FRESH_POSITION_MS,
  gamePlayers,
  HEARTBEAT_M,
  lastPosition,
  requireMember,
  RESCUE_HOLD_MS,
  RESCUE_M,
  RESCUE_SHIELD_MS,
  SHIELD_MS,
  SHOUT_M,
  SHOUTS_PER_ROUND,
  systemMessage,
} from './lib';
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
    if (me.role === 'runner' && game.status === 'hunt') {
      await pickUpBoost(ctx, game, me, { lat, lng });
      await tryRescue(ctx, me, { lat, lng }, now);
    }
    if (game.status === 'hunt' && features(game.rules).heartbeat) await heartbeatAlerts(ctx, me, { lat, lng }, now);
    return { accepted: true as const };
  },
});

// ── Boosts ─────────────────────────────────────────────────────────────

const heldBoosts = (ctx: QueryCtx, playerId: Id<'players'>) =>
  ctx.db.query('boosts').withIndex('by_owner', (q) => q.eq('ownerId', playerId).eq('state', 'held')).collect();

async function nearestMapBoost(ctx: QueryCtx, game: Doc<'games'>, at: { lat: number; lng: number }) {
  let best: { boost: Doc<'boosts'>; d: number } | null = null;
  for (const b of await ctx.db.query('boosts').withIndex('by_game', (q) => q.eq('gameId', game._id).eq('state', 'map')).collect()) {
    if (b.round !== game.round) continue;
    const d = distanceM(b, at);
    if (d <= BOOST_PICK_M && (!best || d < best.d)) best = { boost: b, d };
  }
  return best?.boost ?? null;
}

// Passou perto de um boost com espaço livre: pega. O preço é ficar visível
// ao vivo para os caçadores por alguns segundos.
async function pickUpBoost(ctx: MutationCtx, game: Doc<'games'>, me: Doc<'players'>, at: { lat: number; lng: number }) {
  const boost = await nearestMapBoost(ctx, game, at);
  if (!boost || (await heldBoosts(ctx, me._id)).length >= BOOST_SLOTS) return;
  const now = Date.now();
  const seconds = BOOST_REVEAL_S[boost.kind];
  const until = now + seconds * 1000;
  await ctx.db.patch(boost._id, { state: 'held', ownerId: me._id, takenAt: now });
  await ctx.db.patch(me._id, { revealed: true, revealUntil: Math.max(until, me.revealUntil ?? 0) });
  await ctx.scheduler.runAt(until, internal.play.hideAfterBoost, { playerId: me._id, until });
  await systemMessage(ctx, game._id, `${me.name} pegou um boost. Aparece ao vivo por ${seconds} s.`, 'hunter');
}

export const hideAfterBoost = internalMutation({
  args: { playerId: v.id('players'), until: v.number() },
  handler: async (ctx, { playerId, until }) => {
    const p = await ctx.db.get(playerId);
    if (p?.revealUntil === until) await ctx.db.patch(playerId, { revealed: undefined, revealUntil: undefined });
  },
});

// Corredor usa um boost guardado.
export const useBoost = mutation({
  args: { boostId: v.id('boosts') },
  handler: async (ctx, { boostId }) => {
    const boost = await ctx.db.get(boostId);
    if (!boost) throw new ConvexError('Esse boost não existe mais.');
    const { game, me } = await requireMember(ctx, boost.gameId);
    if (boost.ownerId !== me._id || boost.state !== 'held') throw new ConvexError('Esse boost não é seu.');
    if (game.status !== 'hunt' || me.state !== 'active') throw new ConvexError('Só dá para usar boost durante a caça.');
    await ctx.db.patch(boostId, { state: 'used' });
    if (boost.kind === 'escudo') await ctx.db.patch(me._id, { shieldUntil: Date.now() + SHIELD_MS });
    else await ctx.db.patch(me._id, { nextPing: boost.kind });
    return { kind: boost.kind };
  },
});

// ── Salvar o amigo ─────────────────────────────────────────────────────

// Corredor livre perto (10 m) de um preso por 3 s: os dois voltam ao jogo.
async function tryRescue(ctx: MutationCtx, me: Doc<'players'>, at: { lat: number; lng: number }, now: number) {
  let target: Doc<'players'> | null = null;
  for (const p of await gamePlayers(ctx, me.gameId)) {
    if (p.role !== 'runner' || p.state !== 'caught' || !p.jail) continue;
    if (distanceM(p.jail, at) <= RESCUE_M) target = p;
  }
  if (!target) {
    if (me.rescue) await ctx.db.patch(me._id, { rescue: undefined });
    return;
  }
  if (me.rescue?.targetId !== target._id) {
    await ctx.db.patch(me._id, { rescue: { targetId: target._id, since: now } });
    return;
  }
  if (now - me.rescue.since < RESCUE_HOLD_MS) return;
  await ctx.db.patch(target._id, {
    state: 'active',
    jail: undefined,
    caughtAt: undefined,
    caughtBy: undefined,
    shieldUntil: now + RESCUE_SHIELD_MS,
  });
  await ctx.db.patch(me._id, { rescue: undefined });
  await systemMessage(ctx, me.gameId, `${me.name} soltou ${target.name}! Os dois voltaram para o jogo.`);
  await notify(ctx, [target], 'rescued', 'Você foi solto!', `${me.name} te salvou. Corra: 30 s sem poder ser marcado.`);
}

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
  frame: string | null;
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

    const frames = new Map<Id<'players'>, string | null>();
    for (const p of players) frames.set(p._id, (await ctx.db.get(p.userId))?.frame ?? null);

    for (const p of players) {
      const role = p.role!;
      const isMe = p._id === me._id;
      const base = { id: p._id, name: p.name, role, state: p.state, isMe, frame: frames.get(p._id) ?? null };
      // Preso fica parado onde foi pego, e todo mundo sabe onde (inclusive os caçadores).
      if (p.state === 'caught' && p.jail) {
        seen.push({ ...base, kind: 'live', ...p.jail });
        continue;
      }
      // Corredor e espectador nunca veem caçadores.
      if (!isMe && !iHunt && role === 'hunter') continue;
      // Caçador vê corredor no último ping, a não ser que ele esteja exposto.
      if (!isMe && iHunt && role === 'runner' && !((p.exposed || p.revealed) && p.state === 'active')) {
        if (p.ping) seen.push({ ...base, kind: 'ping', ...p.ping });
        continue;
      }
      // O resto (eu, meu time, corredor exposto) aparece ao vivo.
      const pos = await lastPosition(ctx, p._id);
      if (pos) seen.push({ ...base, kind: 'live', lat: pos.lat, lng: pos.lng, at: pos.at });
    }

    const runners = players.filter((p) => p.role === 'runner');
    const on = features(game.rules);
    const heartbeat = on.heartbeat && game.status === 'hunt' && me.role === 'runner' && me.state === 'active'
      ? await hunterWithin(ctx, players, me._id, HEARTBEAT_M)
      : false;
    // Boosts: o corredor vê os do mapa e os que guardou; o caçador só sabe quantos tem.
    const runner = me.role === 'runner';
    const mapBoosts = (await ctx.db.query('boosts').withIndex('by_game', (q) => q.eq('gameId', gameId).eq('state', 'map')).collect()).filter(
      (b) => b.round === game.round,
    );
    const held = runner ? await heldBoosts(ctx, me._id) : [];
    const myPos = runner && game.status === 'hunt' && held.length >= BOOST_SLOTS ? await lastPosition(ctx, me._id) : null;
    const blocked = myPos ? await nearestMapBoost(ctx, game, myPos) : null;

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
        features: on,
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
        shoutsLeft: on.shouts && me.role === 'hunter' ? (me.shoutsLeft ?? SHOUTS_PER_ROUND) : null,
        shoutedAt: me.role === 'runner' ? (me.shoutedAt ?? null) : null,
        revealUntil: me.revealed ? (me.revealUntil ?? null) : null,
        shieldUntil: me.shieldUntil ?? null,
        nextPing: me.nextPing ?? null,
        boosts: held.sort((a, b) => (a.takenAt ?? 0) - (b.takenAt ?? 0)).map((b) => ({ id: b._id, kind: b.kind })),
        blockedBoost: blocked ? BOOST_NAME[blocked.kind] : null,
        jailed: me.state === 'caught' && !!me.jail,
        rescue: me.rescue ? { name: players.find((p) => p._id === me.rescue!.targetId)?.name ?? '', since: me.rescue.since } : null,
      },
      boosts: runner ? mapBoosts.map((b) => ({ id: b._id, kind: b.kind, lat: b.lat, lng: b.lng })) : [],
      boostsOnMap: mapBoosts.length,
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
// Aviso de coração acelerado com o celular no bolso. Quem se mexe pode ser o
// corredor (chegou perto de um caçador) ou o caçador (chegou perto dele).
// No máximo um aviso por minuto para cada corredor.
const HEARTBEAT_ALERT_EVERY_MS = 60_000;
async function heartbeatAlerts(ctx: MutationCtx, me: Doc<'players'>, at: { lat: number; lng: number }, now: number) {
  if (me.state !== 'active' || !me.role) return;
  const players = await gamePlayers(ctx, me.gameId);
  const runners =
    me.role === 'runner'
      ? (await hunterWithin(ctx, players, me._id, HEARTBEAT_M))
        ? [me]
        : []
      : await (async () => {
          const near = [];
          for (const r of players) {
            if (r.role !== 'runner' || r.state !== 'active') continue;
            const pos = await lastPosition(ctx, r._id);
            if (pos && now - pos.at <= FRESH_POSITION_MS && distanceM(pos, at) <= HEARTBEAT_M) near.push(r);
          }
          return near;
        })();
  for (const r of runners) {
    if (now - (r.heartbeatAlertAt ?? 0) < HEARTBEAT_ALERT_EVERY_MS) continue;
    await ctx.db.patch(r._id, { heartbeatAlertAt: now });
    await notify(ctx, [r], 'heartbeat', 'Coração acelerado', 'Um caçador está a menos de 30 m. Ele não sabe que você sabe.');
  }
}

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
    if (!features(game.rules).shouts) throw new ConvexError('O grito está desligado nesta partida.');
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
    const runner = await ctx.db.get(target.id);
    if (runner) await notify(ctx, [runner], 'shout', 'Seu celular gritou!', 'Um caçador está a menos de 60 m e ouviu. Saia daí.');
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
  const game = await ctx.db.get(runner.gameId);
  const pos = game && features(game.rules).rescue ? await lastPosition(ctx, runner._id) : null;
  await ctx.db.patch(runner._id, {
    state: 'caught',
    caughtAt: Date.now(),
    caughtBy: hunter?._id,
    exposed: undefined,
    outOfZoneSince: undefined,
    revealed: undefined,
    rescue: undefined,
    jail: pos ? { lat: pos.lat, lng: pos.lng, at: Date.now() } : undefined,
  });
  const free = (await gamePlayers(ctx, runner.gameId)).filter((p) => p.role === 'runner' && p.state === 'active').length;
  const who = hunter ? `${hunter.name} pegou ${runner.name}` : `${runner.name} foi pego`;
  await systemMessage(ctx, runner.gameId, `${who}. ${free === 1 ? 'Resta 1 corredor' : `Restam ${free} corredores`}.`);
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
    if (runner.shieldUntil && runner.shieldUntil > Date.now()) {
      throw new ConvexError(`${runner.name} está com Escudo. Tente de novo em ${Math.ceil((runner.shieldUntil - Date.now()) / 1000)} s.`);
    }
    const open = await ctx.db.query('captures').withIndex('by_runner', (q) => q.eq('runnerId', runnerId).eq('status', 'pending')).first();
    if (open) return open._id;

    // Se os dois têm posição, o servidor confere a distância.
    const [a, b] = [await lastPosition(ctx, me._id), await lastPosition(ctx, runnerId)];
    const dist = a && b ? Math.round(distanceM(a, b)) : undefined;
    if (dist !== undefined && dist > MAX_CAPTURE_DISTANCE_M) throw new ConvexError(`Vocês estão a ${dist} m. Chegue mais perto.`);

    const now = Date.now();
    const id = await ctx.db.insert('captures', { gameId, hunterId: me._id, runnerId, status: 'pending', distanceM: dist, createdAt: now, expiresAt: now + CAPTURE_CONFIRM_MS });
    await notify(ctx, [runner], 'capture', `${me.name} disse que te pegou`, 'Confirme no Pique em até 60 s.');
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
