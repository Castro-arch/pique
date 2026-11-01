import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { hasBetaAccess, isBetaAdmin } from './beta';
import { loginProviders } from './auth';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name ?? null,
      username: user.username ?? null,
      email: user.email ?? null,
      betaOk: await hasBetaAccess(ctx, user),
      betaAdmin: isBetaAdmin(user),
      // já tinha entrado com um código que foi trocado
      betaRevoked: user.betaVersion !== undefined && !(await hasBetaAccess(ctx, user)),
      termsVersion: user.termsVersion ?? null,
    };
  },
});

export const setProfile = mutation({
  args: { name: v.string(), username: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError('Faça login para continuar.');

    const name = args.name.trim();
    const username = args.username.trim().toLowerCase();

    if (name.length < 2 || name.length > 40) {
      throw new ConvexError('O nome precisa ter entre 2 e 40 caracteres.');
    }
    if (!USERNAME_RE.test(username)) {
      throw new ConvexError('Usuário: 3 a 20 caracteres, só letras minúsculas, números e _.');
    }

    const taken = await ctx.db
      .query('users')
      .withIndex('username', (q) => q.eq('username', username))
      .unique();
    if (taken && taken._id !== userId) {
      throw new ConvexError('Esse usuário já está em uso.');
    }

    await ctx.db.patch(userId, { name, username });
  },
});

// Aceite dos Termos de uso e da Política de privacidade (e da idade mínima).
export const acceptTerms = mutation({
  args: { version: v.string() },
  handler: async (ctx, { version }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError('Faça login para continuar.');
    await ctx.db.patch(userId, { termsVersion: version, termsAt: Date.now() });
  },
});

// Excluir a conta (Ajustes): apaga perfil, estatísticas, amigos, avisos,
// cosméticos e login. Nas partidas dos últimos 7 dias o nome vira
// "Conta excluída" (a partida inteira é apagada 7 dias depois, rounds.cleanup).
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError('Faça login para continuar.');
    for (const p of await ctx.db.query('players').withIndex('by_user', (q) => q.eq('userId', userId)).collect()) {
      const game = await ctx.db.get(p.gameId);
      const live = game && game.status !== 'ended';
      await ctx.db.patch(p._id, { name: 'Conta excluída', ...(live ? { state: 'left' as const } : {}) });
    }
    const friends = [
      ...(await ctx.db.query('friendships').withIndex('by_pair', (q) => q.eq('a', userId)).collect()),
      ...(await ctx.db.query('friendships').withIndex('by_b', (q) => q.eq('b', userId)).collect()),
    ];
    for (const f of friends) await ctx.db.delete(f._id);
    for (const table of ['player_stats', 'push_subscriptions', 'cosmetics', 'entitlements'] as const) {
      for (const row of await ctx.db.query(table).withIndex('by_user', (q) => q.eq('userId', userId)).collect()) await ctx.db.delete(row._id);
    }
    for (const acc of await ctx.db.query('authAccounts').withIndex('userIdAndProvider', (q) => q.eq('userId', userId)).collect()) {
      for (const c of await ctx.db.query('authVerificationCodes').withIndex('accountId', (q) => q.eq('accountId', acc._id)).collect()) await ctx.db.delete(c._id);
      await ctx.db.delete(acc._id);
    }
    for (const ses of await ctx.db.query('authSessions').withIndex('userId', (q) => q.eq('userId', userId)).collect()) {
      for (const t of await ctx.db.query('authRefreshTokens').withIndex('sessionId', (q) => q.eq('sessionId', ses._id)).collect()) await ctx.db.delete(t._id);
      await ctx.db.delete(ses._id);
    }
    await ctx.db.delete(userId);
  },
});

// Quais formas de entrar estão ligadas no servidor (o e-mail sempre está).
export const loginOptions = query({
  args: {},
  handler: async () => ({ email: true, ...loginProviders }),
});
