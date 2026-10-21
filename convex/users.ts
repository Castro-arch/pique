import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';

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
