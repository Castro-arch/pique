import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Papel escolhido no lobby (draw = sorteio) e papel sorteado na rodada.
export const side = v.union(v.literal('runner'), v.literal('hunter'), v.literal('draw'));
export const role = v.union(v.literal('runner'), v.literal('hunter'));

export const rules = v.object({
  durationMin: v.number(), // 10 a 60
  headStartMin: v.number(), // 1 a 15
  pingEveryMin: v.number(), // 1 a 30
  hunters: v.number(), // 1 a 5
  shrink: v.boolean(),
  shrinkEveryMin: v.number(),
  spectatorsHelp: v.boolean(),
});

export const zone = v.object({ lat: v.number(), lng: v.number(), radius: v.number() });

export default defineSchema({
  ...authTables,

  // Estende a tabela de usuários do Convex Auth com os campos do Pique.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    username: v.optional(v.string()),
  })
    .index('email', ['email'])
    .index('username', ['username']),

  // Uma partida. A mesma partida pode ter várias rodadas (revanche).
  games: defineTable({
    code: v.string(),
    hostId: v.id('users'),
    status: v.union(v.literal('lobby'), v.literal('headstart'), v.literal('hunt'), v.literal('ended')),
    round: v.number(),
    rules,
    rulesVersion: v.number(), // quem começou na v1 termina na v1
    zone: v.optional(zone),
    nextZoneRadius: v.optional(v.number()), // zona nova anunciada 1 min antes de encolher
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    headStartEndsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    lastPingAt: v.optional(v.number()),
    nextPingAt: v.optional(v.number()),
    shrinkAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    winner: v.optional(role),
    endedReason: v.optional(v.union(v.literal('time'), v.literal('all_tagged'), v.literal('abandoned'))),
  })
    .index('by_code', ['code'])
    .index('by_host', ['hostId']),

  // Quem está na partida. O papel da rodada fica em `role`.
  players: defineTable({
    gameId: v.id('games'),
    userId: v.id('users'),
    name: v.string(),
    side, // escolha no lobby
    role: v.optional(role), // sorteado ao começar
    ready: v.boolean(),
    state: v.union(v.literal('active'), v.literal('caught'), v.literal('left')),
    joinedAt: v.number(),
    caughtAt: v.optional(v.number()),
    caughtBy: v.optional(v.id('players')),
    // Último ping: o que os caçadores enxergam do corredor.
    ping: v.optional(v.object({ lat: v.number(), lng: v.number(), at: v.number() })),
    outOfZoneSince: v.optional(v.number()),
    exposed: v.optional(v.boolean()), // fora da zona há mais de 30 s: visível ao vivo
    distanceM: v.optional(v.number()),
    flags: v.optional(v.array(v.string())), // anti-cheat: "mock", "speed", "jump"
    shoutsLeft: v.optional(v.number()), // caçador: gritos que ainda tem na rodada
    shoutedAt: v.optional(v.number()), // corredor: quando o celular dele gritou
  })
    .index('by_game', ['gameId'])
    .index('by_game_user', ['gameId', 'userId'])
    .index('by_user', ['userId']),

  // Só a última posição de cada jogador (o trajeto fica no celular).
  positions: defineTable({
    gameId: v.id('games'),
    playerId: v.id('players'),
    lat: v.number(),
    lng: v.number(),
    accuracy: v.number(),
    at: v.number(),
  })
    .index('by_player', ['playerId'])
    .index('by_game', ['gameId']),

  // Caçador marcou, corredor confirma (MVP do documento).
  captures: defineTable({
    gameId: v.id('games'),
    hunterId: v.id('players'),
    runnerId: v.id('players'),
    status: v.union(v.literal('pending'), v.literal('confirmed'), v.literal('disputed'), v.literal('cancelled')),
    distanceM: v.optional(v.number()),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index('by_game', ['gameId'])
    .index('by_runner', ['runnerId', 'status'])
    .index('by_hunter', ['hunterId', 'status']),

  // Radio por time: respostas prontas ou áudio (apagado no fim da partida).
  messages: defineTable({
    gameId: v.id('games'),
    playerId: v.optional(v.id('players')),
    team: v.union(role, v.literal('all')),
    kind: v.union(v.literal('quick'), v.literal('audio'), v.literal('system')),
    text: v.optional(v.string()),
    audioId: v.optional(v.id('_storage')),
    seconds: v.optional(v.number()),
    at: v.number(),
  }).index('by_game', ['gameId', 'at']),

  // Compras do anfitrião (gravadas pelo webhook da RevenueCat).
  entitlements: defineTable({
    userId: v.id('users'),
    lifetime: v.boolean(),
    passUntil: v.optional(v.number()),
  }).index('by_user', ['userId']),

  // Métricas de cada rodada (sem dados pessoais).
  match_stats: defineTable({
    gameId: v.id('games'),
    round: v.number(),
    players: v.number(),
    durationMin: v.number(),
    endedReason: v.string(),
    winner: v.optional(v.string()),
    at: v.number(),
  }),
});
