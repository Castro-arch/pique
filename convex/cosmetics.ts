import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';
import { BETA_FREE_UNLOCK, requireUser } from './lib';

// Catálogo das molduras. Só visual: nada aqui muda ping, visibilidade ou pega.
// price null = grátis. As pagas entram na tabela cosmetics pelo webhook da loja.
export const CATALOG = [
  { id: 'neon', name: 'Neon', price: null, isNew: false },
  { id: 'arcoiris', name: 'Arco-íris', price: null, isNew: false },
  { id: 'gelo', name: 'Gelo', price: 'R$ 4,90', isNew: true },
  { id: 'chamas', name: 'Chamas', price: 'R$ 4,90', isNew: false },
  { id: 'ouro', name: 'Ouro', price: 'R$ 6,90', isNew: false },
] as const;

async function owns(ctx: QueryCtx, userId: Id<'users'>, itemId: string) {
  const item = CATALOG.find((i) => i.id === itemId);
  if (!item) return false;
  if (item.price === null) return true;
  return !!(await ctx.db.query('cosmetics').withIndex('by_user', (q) => q.eq('userId', userId).eq('itemId', itemId)).unique());
}

export const shop = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const user = await ctx.db.get(userId);
    const items = [];
    for (const i of CATALOG) items.push({ ...i, owned: await owns(ctx, userId, i.id), equipped: user?.frame === i.id });
    return { frame: user?.frame ?? null, items };
  },
});

// Equipa uma moldura que a pessoa tem (ou tira, com null).
export const equip = mutation({
  args: { itemId: v.union(v.string(), v.null()) },
  handler: async (ctx, { itemId }) => {
    const userId = await requireUser(ctx);
    if (itemId !== null && !(await owns(ctx, userId, itemId))) throw new ConvexError('Essa moldura ainda não é sua.');
    await ctx.db.patch(userId, { frame: itemId ?? undefined });
  },
});

// Beta: "comprar" libera a moldura sem cobrar (ver BETA_FREE_UNLOCK).
export const buy = mutation({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    if (!BETA_FREE_UNLOCK) throw new ConvexError('A compra é feita pela loja do celular.');
    const userId = await requireUser(ctx);
    const item = CATALOG.find((i) => i.id === itemId);
    if (!item) throw new ConvexError('Essa moldura não existe.');
    if (!(await owns(ctx, userId, itemId))) await ctx.db.insert('cosmetics', { userId, itemId, at: Date.now() });
    await ctx.db.patch(userId, { frame: itemId });
  },
});
