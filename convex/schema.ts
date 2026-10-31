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
  // Boosts e tensão (10.8). Sem valor = ligado, para partidas antigas.
  boosts: v.optional(v.boolean()),
  boostAmount: v.optional(v.union(v.literal('few'), v.literal('normal'), v.literal('many'))),
  heartbeat: v.optional(v.boolean()),
  shouts: v.optional(v.boolean()),
  rescue: v.optional(v.boolean()),
});

export const boostKind = v.union(v.literal('despiste'), v.literal('sombra'), v.literal('escudo'));

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
    frame: v.optional(v.string()), // moldura equipada (cosmético)
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
    // Pontos em cima das ruas da zona (OpenStreetMap): onde os boosts nascem.
    streets: v.optional(v.object({ key: v.string(), points: v.array(v.object({ lat: v.number(), lng: v.number() })) })),
    // Roleta de luz girando: cada passo é um celular aceso num horário.
    // stops = índices dos passos onde a luz parou (um por caçador).
    draw: v.optional(
      v.object({
        startAt: v.number(),
        endAt: v.number(),
        order: v.array(v.id('players')),
        steps: v.array(v.object({ at: v.number(), p: v.id('players') })),
        stops: v.array(v.number()),
        hunters: v.array(v.id('players')),
      }),
    ),
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
    // Boosts: o preço de pegar (visível ao vivo por alguns segundos) e os efeitos ativos.
    revealed: v.optional(v.boolean()),
    revealUntil: v.optional(v.number()),
    nextPing: v.optional(v.union(v.literal('sombra'), v.literal('despiste'))),
    shieldUntil: v.optional(v.number()),
    // Salvar o amigo: o pego fica preso onde foi pego; um corredor perto por 3 s solta.
    jail: v.optional(v.object({ lat: v.number(), lng: v.number(), at: v.number() })),
    rescue: v.optional(v.object({ targetId: v.id('players'), since: v.number() })),
    heartbeatAlertAt: v.optional(v.number()), // último aviso de coração acelerado (não repete a cada passo)
    heading: v.optional(v.number()), // para onde está virado (graus, 0 = norte), da bússola do celular
    headingAt: v.optional(v.number()),
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

  // Boosts espalhados pela zona. O corredor pega passando perto e guarda até 2.
  boosts: defineTable({
    gameId: v.id('games'),
    round: v.number(),
    kind: boostKind,
    lat: v.number(),
    lng: v.number(),
    state: v.union(v.literal('map'), v.literal('held'), v.literal('used')),
    ownerId: v.optional(v.id('players')),
    takenAt: v.optional(v.number()),
  })
    .index('by_game', ['gameId', 'state'])
    .index('by_owner', ['ownerId', 'state']),

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

  // Avisos da partida para cada jogador (ping, coração acelerado, grito...).
  // O app Android mostra como notificação quando está em segundo plano; o
  // site recebe como push. Apagados com a partida.
  alerts: defineTable({
    gameId: v.id('games'),
    playerId: v.id('players'),
    kind: v.string(),
    title: v.string(),
    body: v.string(),
    at: v.number(),
  })
    .index('by_player', ['playerId', 'at'])
    .index('by_game', ['gameId']),

  // Inscrições de push do site (Web Push), uma por navegador.
  push_subscriptions: defineTable({
    userId: v.id('users'),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    at: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_endpoint', ['endpoint']),

  // Cosméticos comprados (gravados pelo webhook da loja). Os grátis não entram aqui.
  cosmetics: defineTable({
    userId: v.id('users'),
    itemId: v.string(),
    at: v.number(),
  }).index('by_user', ['userId', 'itemId']),

  // Compras do anfitrião (gravadas pelo webhook da RevenueCat).
  entitlements: defineTable({
    userId: v.id('users'),
    lifetime: v.boolean(),
    passUntil: v.optional(v.number()),
  }).index('by_user', ['userId']),

  // Amizades: um par de pessoas (a < b) com o pedido ou a amizade.
  friendships: defineTable({
    a: v.id('users'),
    b: v.id('users'),
    from: v.id('users'), // quem pediu
    status: v.union(v.literal('pending'), v.literal('accepted')),
    at: v.number(),
  })
    .index('by_pair', ['a', 'b'])
    .index('by_b', ['b']),

  // Números do perfil, somados no fim de cada rodada.
  player_stats: defineTable({
    userId: v.id('users'),
    games: v.number(),
    wins: v.number(),
    catches: v.number(),
    escapes: v.number(),
    bestHiddenMs: v.number(),
    distanceM: v.number(),
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
