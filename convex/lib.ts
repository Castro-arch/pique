import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

type Ctx = QueryCtx | MutationCtx;

// Regras padrão (as mais jogadas) e limites aceitos pelo servidor.
export const DEFAULT_RULES = {
  durationMin: 30,
  headStartMin: 1,
  pingEveryMin: 2,
  hunters: 2,
  shrink: true,
  shrinkEveryMin: 5,
  spectatorsHelp: false,
};
export const LIMITS = {
  durationMin: [10, 60],
  headStartMin: [1, 15],
  pingEveryMin: [1, 30],
  hunters: [1, 5],
  shrinkEveryMin: [2, 15],
  zoneRadius: [75, 1500],
} as const;
export const RULES_VERSION = 1;

// O que está ligado nesta partida. Regra sem valor conta como ligada.
export function features(rules: Doc<'games'>['rules']) {
  return {
    boosts: rules.boosts !== false,
    heartbeat: rules.heartbeat !== false,
    shouts: rules.shouts !== false,
    rescue: rules.rescue !== false,
    // Modo lanterna: sem ping; os caçadores apontam o celular e veem quem está no feixe.
    lanterna: rules.mode === 'lanterna',
  };
}
export const MAX_PLAYERS = 20;
export const FREE_HOSTED_GAMES = 3;
// Beta sem pagamento ligado: "comprar" libera a hospedagem de graça.
// DESLIGAR (false) quando a compra real (RevenueCat/loja) entrar.
export const BETA_FREE_UNLOCK = true;
export const MIN_ZONE_RADIUS = 75; // a zona encolhe até aqui (150 m de diâmetro)
export const OUT_OF_ZONE_GRACE_MS = 30_000;
export const CAPTURE_CONFIRM_MS = 60_000;
export const MIN = 60_000;
export const HEARTBEAT_M = 30; // corredor sente o coração acelerar com caçador a menos disso
export const SHOUT_M = 60; // alcance do grito
export const SHOUTS_PER_ROUND = 3;
export const BOOST_EVERY_MIN = 4; // uma onda de boosts a cada 4 min de caça
export const BOOSTS_PER_WAVE = { few: 2, normal: 3, many: 5 } as const;
export const BOOST_PICK_M = 15; // passa a menos disso e pega
export const BOOST_SLOTS = 2; // guarda no máximo 2
export const BOOST_REVEAL_S = { despiste: 2, sombra: 5, escudo: 8 } as const; // quanto mais forte, mais tempo visível
export const SHIELD_MS = 2 * 60_000;
export const DESPISTE_M = 60;
export const BOOST_NAME = { despiste: 'Despiste', sombra: 'Sombra', escudo: 'Escudo', radar: 'Radar', faro: 'Faro', holofote: 'Holofote' } as const;
// Boosts do caçador: aparecem só no mapa dele, guarda 1 de cada vez, e o preço vem ao usar.
export const HUNTER_BOOSTS = ['radar', 'faro', 'holofote'] as const;
export const isHunterBoost = (kind: string) => (HUNTER_BOOSTS as readonly string[]).includes(kind);
export const HUNTER_BOOST_SLOTS = 1;
export const HUNTER_BOOSTS_PER_WAVE = 2;
export const RADAR_DELAY_MS = 60_000; // o Radar dispara um ping agora e o próximo atrasa 1 min
export const FARO_MS = 10_000; // o Faro mostra o corredor mais perto ao vivo por 10 s
export const SPOT_MS = 10_000; // o Holofote ilumina por 10 s
export const SPOT_M = 80; // ... os corredores a até 80 m (e todos veem esse caçador)
export const RESCUE_M = 10; // chega a menos disso do preso
export const RESCUE_HOLD_MS = 3_000; // e fica 3 s
export const RESCUE_SHIELD_MS = 30_000; // quem foi solto não pode ser marcado logo em seguida
export const FRESH_POSITION_MS = 60_000; // posição mais velha que isso não conta para coração e grito
export const BEAM_M = 120; // lanterna: o feixe alcança 120 m
export const BEAM_DEG = 25; // ... e abre 25° para cada lado de onde o celular aponta
export const FRESH_HEADING_MS = 30_000; // bússola parada há mais que isso não conta
export const ZONE_MAX_CORNERS = 16;

// Sem letras que confundem (0/O, 1/I/L).
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
// Sorteio criptográfico (Math.random dá para prever).
export function newCode() {
  const bytes = new Uint32Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => CODE_CHARS[n % CODE_CHARS.length]).join('');
}

export async function requireUser(ctx: Ctx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError('Faça login para continuar.');
  return userId;
}

// Partida + o jogador que está chamando. Quem não está na partida não vê nada.
export async function requireMember(ctx: Ctx, gameId: Id<'games'>) {
  const userId = await requireUser(ctx);
  const game = await ctx.db.get(gameId);
  if (!game) throw new ConvexError('Essa partida não existe mais.');
  const me = await ctx.db
    .query('players')
    .withIndex('by_game_user', (q) => q.eq('gameId', gameId).eq('userId', userId))
    .unique();
  if (!me || me.state === 'left') throw new ConvexError('Você não está nessa partida.');
  return { userId, game, me };
}

// Como requireMember, mas devolve null para quem saiu (ou nunca entrou), em vez
// de erro. Para as consultas que ficam abertas na tela: quem sai da partida
// não pode derrubar o app enquanto a navegação acontece.
export async function memberOrNull(ctx: Ctx, gameId: Id<'games'>) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  const game = await ctx.db.get(gameId);
  if (!game) return null;
  const me = await ctx.db
    .query('players')
    .withIndex('by_game_user', (q) => q.eq('gameId', gameId).eq('userId', userId))
    .unique();
  if (!me || me.state === 'left') return null;
  return { userId, game, me };
}

export function requireHost(game: Doc<'games'>, userId: Id<'users'>) {
  if (game.hostId !== userId) throw new ConvexError('Só o anfitrião pode fazer isso.');
}

// NaN e infinito caem no mínimo (sem isso, NaN passava direto e quebrava a partida).
export const clamp = (n: number, [min, max]: readonly [number, number]) => (Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : min);

// Distância em metros entre dois pontos (haversine).
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Ponto a `m` metros de `p` na direção `angle` (radianos, 0 = leste).
export function offsetM(p: { lat: number; lng: number }, m: number, angle: number) {
  const dLat = (m * Math.sin(angle)) / 111_320;
  const dLng = (m * Math.cos(angle)) / (111_320 * Math.cos((p.lat * Math.PI) / 180));
  return { lat: p.lat + dLat, lng: p.lng + dLng };
}

// Rumo de `a` para `b` em graus (0 = norte, 90 = leste), como a bússola.
export function bearingDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dy = b.lat - a.lat;
  const dx = (b.lng - a.lng) * Math.cos((a.lat * Math.PI) / 180);
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

// `p` está no feixe da lanterna de quem está em `from` apontando para `heading`?
export function inBeam(from: { lat: number; lng: number }, heading: number, p: { lat: number; lng: number }) {
  const d = distanceM(from, p);
  if (d > BEAM_M) return false;
  if (d < 5) return true; // colado no caçador conta, a direção nessa distância não diz nada
  return Math.abs(((bearingDeg(from, p) - heading + 540) % 360) - 180) <= BEAM_DEG;
}

// Zona: um círculo ou um desenho (polígono). O desenho é guardado do tamanho
// em que foi feito (shapeRadius); quando a zona encolhe, só o raio muda e os
// cantos se aproximam do centro na mesma proporção.
type Pt = { lat: number; lng: number };
type Zone = Pt & { radius: number; shape?: Pt[]; shapeRadius?: number };

export function zoneCorners(zone: Zone, scale = 1) {
  if (!zone.shape?.length) return null;
  const f = (zone.radius / (zone.shapeRadius ?? zone.radius)) * scale;
  return zone.shape.map((c) => ({ lat: zone.lat + (c.lat - zone.lat) * f, lng: zone.lng + (c.lng - zone.lng) * f }));
}

// Dentro da zona? scale < 1 pede uma folga da borda.
export function inZone(p: Pt, zone: Zone, scale = 1) {
  const corners = zoneCorners(zone, scale);
  if (!corners) return distanceM(p, zone) <= zone.radius * scale;
  let inside = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const a = corners[i];
    const b = corners[j];
    if (a.lat > p.lat !== b.lat > p.lat && p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng) inside = !inside;
  }
  return inside;
}

export async function gamePlayers(ctx: Ctx, gameId: Id<'games'>) {
  return ctx.db
    .query('players')
    .withIndex('by_game', (q) => q.eq('gameId', gameId))
    .collect();
}

export async function lastPosition(ctx: Ctx, playerId: Id<'players'>) {
  return ctx.db
    .query('positions')
    .withIndex('by_player', (q) => q.eq('playerId', playerId))
    .unique();
}

export async function systemMessage(ctx: MutationCtx, gameId: Id<'games'>, text: string, team: 'runner' | 'hunter' | 'all' = 'all') {
  await ctx.db.insert('messages', { gameId, team, kind: 'system', text, at: Date.now() });
}
