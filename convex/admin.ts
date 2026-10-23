import { internalMutation } from './_generated/server';

// Zera o beta: apaga todas as contas, sessões e partidas para os @ ficarem
// livres de novo. Interno: só roda pelo terminal, nunca pelo app.
//   npx convex run admin:resetBeta
// Agendamentos pendentes (pings, fim de rodada) não quebram: cada um confere
// se a partida ainda existe antes de agir.
const TABLES = [
  'messages',
  'boosts',
  'cosmetics',
  'captures',
  'positions',
  'players',
  'match_stats',
  'games',
  'entitlements',
  'authVerificationCodes',
  'authVerifiers',
  'authRefreshTokens',
  'authSessions',
  'authAccounts',
  'authRateLimits',
  'users',
] as const;

export const resetBeta = internalMutation({
  args: {},
  handler: async (ctx) => {
    const removed: Record<string, number> = {};
    // Áudios do Radio ficam no armazenamento, fora das tabelas.
    for (const m of await ctx.db.query('messages').collect()) {
      if (m.audioId) await ctx.storage.delete(m.audioId);
    }
    for (const table of TABLES) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) await ctx.db.delete(row._id);
      removed[table] = rows.length;
    }
    return removed;
  },
});
