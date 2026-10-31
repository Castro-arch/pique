import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx } from './_generated/server';
import {
  clamp,
  DEFAULT_RULES,
  FREE_HOSTED_GAMES,
  gamePlayers,
  LIMITS,
  MAX_PLAYERS,
  MIN,
  newCode,
  requireHost,
  memberOrNull,
  requireMember,
  requireUser,
  RULES_VERSION,
  systemMessage,
} from './lib';
import { side } from './schema';

// ── Lobby ──────────────────────────────────────────────────────────────

async function displayName(ctx: MutationCtx, userId: Id<'users'>) {
  const user = await ctx.db.get(userId);
  if (!user?.name) throw new ConvexError('Complete seu perfil antes de jogar.');
  return user.name;
}

// Pode hospedar? 3 partidas grátis, depois Passe da Noite ou Host Vitalício.
async function canHost(ctx: MutationCtx, userId: Id<'users'>) {
  const ent = await ctx.db
    .query('entitlements')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();
  if (ent?.lifetime || (ent?.passUntil ?? 0) > Date.now()) return true;
  const hosted = await ctx.db
    .query('games')
    .withIndex('by_host', (q) => q.eq('hostId', userId))
    .collect();
  return hosted.length < FREE_HOSTED_GAMES;
}

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const name = await displayName(ctx, userId);

    // Limite simples contra abuso: até 5 partidas criadas por hora.
    const recent = await ctx.db
      .query('games')
      .withIndex('by_host', (q) => q.eq('hostId', userId))
      .filter((q) => q.gt(q.field('createdAt'), Date.now() - 60 * MIN))
      .collect();
    if (recent.length >= 5) throw new ConvexError('Calma! Espere um pouco antes de criar outra partida.');
    if (!(await canHost(ctx, userId))) throw new ConvexError({ code: 'PAYWALL' });

    let code = newCode();
    while (await ctx.db.query('games').withIndex('by_code', (q) => q.eq('code', code)).first()) code = newCode();

    const gameId = await ctx.db.insert('games', {
      code,
      hostId: userId,
      status: 'lobby',
      round: 0,
      rules: DEFAULT_RULES,
      rulesVersion: RULES_VERSION,
      createdAt: Date.now(),
    });
    await ctx.db.insert('players', { gameId, userId, name, side: 'runner', ready: true, state: 'active', joinedAt: Date.now() });
    // Partidas são apagadas 7 dias depois de criadas (documento: retenção curta).
    await ctx.scheduler.runAfter(7 * 24 * 60 * MIN, internal.rounds.cleanup, { gameId });
    return { gameId, code };
  },
});

// Prévia do convite: o que aparece antes de entrar.
export const preview = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    await requireUser(ctx);
    const game = await ctx.db
      .query('games')
      .withIndex('by_code', (q) => q.eq('code', code.trim().toUpperCase()))
      .first();
    if (!game) return null;
    const host = await ctx.db.get(game.hostId);
    const players = (await gamePlayers(ctx, game._id)).filter((p) => p.state !== 'left');
    return {
      gameId: game._id,
      code: game.code,
      status: game.status,
      hostName: host?.name ?? 'Anfitrião',
      players: players.length,
      full: players.length >= MAX_PLAYERS,
      rules: game.rules,
      zoneMeters: game.zone ? Math.round(game.zone.radius * 2) : null,
      endsAt: game.endsAt ?? null,
    };
  },
});

export const join = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await requireUser(ctx);
    const game = await ctx.db
      .query('games')
      .withIndex('by_code', (q) => q.eq('code', code.trim().toUpperCase()))
      .first();
    if (!game) throw new ConvexError({ code: 'NOT_FOUND' });

    const existing = await ctx.db
      .query('players')
      .withIndex('by_game_user', (q) => q.eq('gameId', game._id).eq('userId', userId))
      .unique();
    if (existing && existing.state !== 'left') return { gameId: game._id };
    if (game.status !== 'lobby') throw new ConvexError({ code: 'IN_PROGRESS' });

    const players = (await gamePlayers(ctx, game._id)).filter((p) => p.state !== 'left');
    if (players.length >= MAX_PLAYERS) throw new ConvexError({ code: 'FULL' });

    const name = await displayName(ctx, userId);
    if (existing) {
      await ctx.db.patch(existing._id, { state: 'active', ready: false, joinedAt: Date.now(), name });
    } else {
      await ctx.db.insert('players', { gameId: game._id, userId, name, side: 'draw', ready: false, state: 'active', joinedAt: Date.now() });
    }
    return { gameId: game._id };
  },
});

// Tudo que o lobby mostra: partida, regras e quem está dentro.
export const lobby = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const member = await memberOrNull(ctx, gameId);
    if (!member) return null; // quem saiu (ou nunca entrou) não vê o lobby
    const { userId, game, me } = member;
    const players = (await gamePlayers(ctx, gameId))
      .filter((p) => p.state !== 'left')
      .sort((a, b) => a.joinedAt - b.joinedAt);
    return {
      gameId,
      code: game.code,
      status: game.status,
      round: game.round,
      rules: game.rules,
      zone: game.zone ?? null,
      isHost: game.hostId === userId,
      // Roleta girando: todo mundo acende o próprio celular na hora certa.
      draw: game.draw
        ? {
            startAt: game.draw.startAt,
            endAt: game.draw.endAt,
            order: game.draw.order,
            steps: game.draw.steps.map((s) => ({ at: s.at, id: s.p })),
            stops: game.draw.stops,
          }
        : null,
      me: { id: me._id, side: me.side, role: me.role ?? null, ready: me.ready, state: me.state },
      players: players.map((p) => ({
        id: p._id,
        name: p.name,
        side: p.side,
        ready: p.ready,
        choosing: isChoosing(p, game),
        isHost: p.userId === game.hostId,
        isMe: p._id === me._id,
        // O papel sorteado só aparece para o próprio time (ou depois do fim).
        role: game.status === 'ended' || p._id === me._id || (me.role && p.role === me.role) ? (p.role ?? null) : null,
      })),
    };
  },
});

// Ainda escolhendo o lado: entrou e não confirmou, nem jogou nenhuma rodada desta
// partida (quem já jogou não trava a revanche). O anfitrião nunca trava.
export function isChoosing(p: Doc<'players'>, game: Doc<'games'>) {
  return p.state !== 'left' && !p.ready && !p.role && p.userId !== game.hostId;
}

export const setSide = mutation({
  args: { gameId: v.id('games'), side },
  handler: async (ctx, { gameId, side }) => {
    const { game, me } = await requireMember(ctx, gameId);
    if (game.status !== 'lobby' && game.status !== 'ended') throw new ConvexError('A rodada já começou.');
    // Confirmar o lado conta como pronto: o anfitrião só começa depois disso.
    await ctx.db.patch(me._id, { side, ready: true });
  },
});

export const setReady = mutation({
  args: { gameId: v.id('games'), ready: v.boolean() },
  handler: async (ctx, { gameId, ready }) => {
    const { me } = await requireMember(ctx, gameId);
    await ctx.db.patch(me._id, { ready });
  },
});

export const setRules = mutation({
  args: {
    gameId: v.id('games'),
    rules: v.object({
      durationMin: v.number(),
      headStartMin: v.number(),
      pingEveryMin: v.number(),
      hunters: v.number(),
      shrink: v.boolean(),
      shrinkEveryMin: v.number(),
      spectatorsHelp: v.boolean(),
      boosts: v.optional(v.boolean()),
      boostAmount: v.optional(v.union(v.literal('few'), v.literal('normal'), v.literal('many'))),
      heartbeat: v.optional(v.boolean()),
      shouts: v.optional(v.boolean()),
      rescue: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { gameId, rules }) => {
    const { userId, game } = await requireMember(ctx, gameId);
    requireHost(game, userId);
    if (game.status === 'headstart' || game.status === 'hunt') throw new ConvexError('A rodada já começou.');
    const durationMin = clamp(rules.durationMin, LIMITS.durationMin);
    await ctx.db.patch(gameId, {
      rules: {
        durationMin,
        headStartMin: Math.min(clamp(rules.headStartMin, LIMITS.headStartMin), durationMin - 5),
        pingEveryMin: clamp(rules.pingEveryMin, LIMITS.pingEveryMin),
        hunters: clamp(rules.hunters, LIMITS.hunters),
        shrink: rules.shrink,
        shrinkEveryMin: clamp(rules.shrinkEveryMin, LIMITS.shrinkEveryMin),
        spectatorsHelp: rules.spectatorsHelp,
        boosts: rules.boosts ?? game.rules.boosts,
        boostAmount: rules.boostAmount ?? game.rules.boostAmount,
        heartbeat: rules.heartbeat ?? game.rules.heartbeat,
        shouts: rules.shouts ?? game.rules.shouts,
        rescue: rules.rescue ?? game.rules.rescue,
      },
    });
  },
});

export const setZone = mutation({
  args: { gameId: v.id('games'), lat: v.number(), lng: v.number(), radius: v.number() },
  handler: async (ctx, { gameId, lat, lng, radius }) => {
    const { userId, game } = await requireMember(ctx, gameId);
    requireHost(game, userId);
    if (game.status === 'headstart' || game.status === 'hunt') throw new ConvexError('A rodada já começou.');
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new ConvexError('Posição inválida.');
    await ctx.db.patch(gameId, { zone: { lat, lng, radius: clamp(radius, LIMITS.zoneRadius) } });
  },
});

// Sair: no lobby a vaga some e o anfitrião passa adiante; na rodada vira "saiu".
export const leave = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const { userId, game, me } = await requireMember(ctx, gameId);
    await ctx.db.patch(me._id, { state: 'left', ready: false });
    const playing = game.status === 'headstart' || game.status === 'hunt';
    if (playing) await systemMessage(ctx, gameId, `${me.name} saiu da partida.`);

    const rest = (await gamePlayers(ctx, gameId)).filter((p) => p.state !== 'left').sort((a, b) => a.joinedAt - b.joinedAt);
    if (rest.length === 0) {
      if (playing) await ctx.runMutation(internal.rounds.end, { gameId, round: game.round, reason: 'abandoned' });
      return;
    }
    if (game.hostId === userId) {
      await ctx.db.patch(gameId, { hostId: rest[0].userId });
      await systemMessage(ctx, gameId, `${me.name} saiu. Agora ${rest[0].name} é o anfitrião.`);
    }
    if (playing) await ctx.runMutation(internal.rounds.checkEnd, { gameId, round: game.round });
  },
});

// Minhas partidas recentes (para "voltar para a partida" na Home).
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const rows = await ctx.db
      .query('players')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(10);
    const out: { gameId: Id<'games'>; code: string; status: Doc<'games'>['status'] }[] = [];
    for (const p of rows) {
      if (p.state === 'left') continue;
      const g = await ctx.db.get(p.gameId);
      if (g && g.status !== 'ended') out.push({ gameId: g._id, code: g.code, status: g.status });
    }
    return out;
  },
});
