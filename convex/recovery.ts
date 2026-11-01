import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalQuery, mutation, query } from './_generated/server';
import { requireUser } from './lib';

// Código de recuperação da conta. No beta a conta é anônima e fica presa ao
// navegador: se a pessoa limpar os dados ou trocar de celular, perde tudo. Nos
// Ajustes ela gera um código secreto (XXXX-XXXX-XXXX) e, em outro aparelho,
// entra com ele em "Já tenho conta". Guardamos só o hash do código; gerar um
// novo invalida o anterior.

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I/L
const LENGTH = 12;

export const normalizeRecovery = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');

async function hashCode(code: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`pique:${code}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

function randomCode() {
  const bytes = new Uint32Array(LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => CHARS[n % CHARS.length]).join('');
}

// Gera (ou troca) o código. Ele só aparece agora: depois, nem o servidor sabe qual é.
export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const code = randomCode();
    await ctx.db.patch(userId, { recoveryHash: await hashCode(code), recoveryAt: Date.now() });
    return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`;
  },
});

// Para os Ajustes: a conta já tem código? Desde quando?
export const status = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    return { has: !!user?.recoveryHash, at: user?.recoveryAt ?? null };
  },
});

// De quem é este código? (null se não bate com nenhuma conta)
export const userByCode = internalQuery({
  args: { code: v.string() },
  handler: async (ctx, args): Promise<Id<'users'> | null> => {
    const code = normalizeRecovery(args.code);
    if (code.length !== LENGTH) return null;
    const hash = await hashCode(code);
    const user = await ctx.db
      .query('users')
      .withIndex('recoveryHash', (q) => q.eq('recoveryHash', hash))
      .unique();
    return user?._id ?? null;
  },
});

// Forma de entrar "recovery": o app chama signIn('recovery', { code }).
export const Recovery: ReturnType<typeof ConvexCredentials> = ConvexCredentials({
  id: 'recovery',
  authorize: async (params, ctx): Promise<{ userId: Id<'users'> } | null> => {
    const userId: Id<'users'> | null = await ctx.runQuery(internal.recovery.userByCode, { code: String(params.code ?? '') });
    return userId ? { userId } : null;
  },
});
