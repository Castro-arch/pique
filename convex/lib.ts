import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

type Ctx = QueryCtx | MutationCtx;

// Regras padrão (as mais jogadas) e limites aceitos pelo servidor.
export const DEFAULT_RULES = {
  durationMin: 30,
  headStartMin: 3,
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
export const MAX_PLAYERS = 20;
export const FREE_HOSTED_GAMES = 3;
export const MIN_ZONE_RADIUS = 75; // a zona encolhe até aqui (150 m de diâmetro)
export const OUT_OF_ZONE_GRACE_MS = 30_000;
export const CAPTURE_CONFIRM_MS = 60_000;
export const MIN = 60_000;

// Sem letras que confundem (0/O, 1/I/L).
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
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

export function requireHost(game: Doc<'games'>, userId: Id<'users'>) {
  if (game.hostId !== userId) throw new ConvexError('Só o anfitrião pode fazer isso.');
}

export const clamp = (n: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, Math.round(n)));

// Distância em metros entre dois pontos (haversine).
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
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
