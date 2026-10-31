import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

// Números do perfil (carteirinha): somados no fim de cada rodada.
// Nível e medalhas saem desses números, nada é guardado à parte.

export type Stats = {
  games: number; // rodadas jogadas
  wins: number;
  catches: number; // corredores que pegou como caçador
  escapes: number; // rodadas que terminou livre como corredor
  bestHiddenMs: number; // maior tempo sem ser pego numa rodada
  distanceM: number; // somando todas as rodadas
};

const EMPTY: Stats = { games: 0, wins: 0, catches: 0, escapes: 0, bestHiddenMs: 0, distanceM: 0 };

export async function statsOf(ctx: QueryCtx, userId: Id<'users'>): Promise<Stats> {
  const row = await ctx.db
    .query('player_stats')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();
  if (!row) return { ...EMPTY };
  const { games, wins, catches, escapes, bestHiddenMs, distanceM } = row;
  return { games, wins, catches, escapes, bestHiddenMs, distanceM };
}

// XP: jogar conta, ganhar conta mais. Cada nível pede 500 XP.
const NAMES = ['Novato', 'Curioso', 'Ligeiro', 'Sorrateiro', 'Atento', 'Rápido', 'Esperto', 'Raposa', 'Sombra', 'Lenda'];
export function levelOf(s: Stats) {
  const xp = s.games * 50 + s.wins * 100 + s.catches * 30 + s.escapes * 40;
  const level = 1 + Math.floor(xp / 500);
  return { xp, level, name: NAMES[Math.min(level, NAMES.length) - 1], next: NAMES[Math.min(level, NAMES.length - 1)], into: xp % 500, need: 500 };
}

export const MEDALS = [
  { id: 'fantasma', name: 'Fantasma', hint: 'Termine livre 3 rodadas', test: (s: Stats) => s.escapes >= 3 },
  { id: 'chamas', name: 'Em chamas', hint: 'Ganhe 5 rodadas', test: (s: Stats) => s.wins >= 5 },
  { id: 'maratona', name: 'Maratona', hint: 'Corra 5 km somando tudo', test: (s: Stats) => s.distanceM >= 5000 },
  { id: 'cacador', name: 'Caçador nato', hint: 'Pegue 10 corredores', test: (s: Stats) => s.catches >= 10 },
  { id: 'escondido', name: 'Paciência', hint: 'Fique 20 min sem ser pego', test: (s: Stats) => s.bestHiddenMs >= 20 * 60_000 },
  { id: 'veterano', name: 'Veterano', hint: 'Jogue 25 rodadas', test: (s: Stats) => s.games >= 25 },
] as const;

export function medalsOf(s: Stats) {
  return MEDALS.map((m) => ({ id: m.id, name: m.name, hint: m.hint, won: m.test(s) }));
}

// Fim da rodada: soma o resultado de cada um no perfil.
export async function recordRound(ctx: MutationCtx, game: Doc<'games'>, players: Doc<'players'>[], winner: 'hunter' | 'runner', endedAt: number) {
  const started = game.startedAt ?? endedAt;
  const catches = new Map<string, number>();
  for (const p of players) if (p.caughtBy) catches.set(p.caughtBy, (catches.get(p.caughtBy) ?? 0) + 1);
  for (const p of players) {
    if (!p.role) continue;
    const free = p.role === 'runner' && p.state === 'active';
    const hidden = p.role === 'runner' ? (p.caughtAt ?? (p.state === 'active' ? endedAt : started)) - started : 0;
    const row = await ctx.db
      .query('player_stats')
      .withIndex('by_user', (q) => q.eq('userId', p.userId))
      .unique();
    const s = row ?? { userId: p.userId, ...EMPTY };
    const next = {
      games: s.games + 1,
      wins: s.wins + (p.role === winner ? 1 : 0),
      catches: s.catches + (catches.get(p._id) ?? 0),
      escapes: s.escapes + (free ? 1 : 0),
      bestHiddenMs: Math.max(s.bestHiddenMs, Math.max(0, hidden)),
      distanceM: s.distanceM + Math.round(p.distanceM ?? 0),
    };
    if (row) await ctx.db.patch(row._id, next);
    else await ctx.db.insert('player_stats', { userId: p.userId, ...next });
  }
}
