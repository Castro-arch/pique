/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';

import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';
import { LEGAL_VERSION } from './legalVersion';

const modules = import.meta.glob('./**/*.ts');

async function setup() {
  const t = convexTest(schema, modules);
  const user = async (name: string) => {
    const id = await t.run((ctx) => ctx.db.insert('users', { name, username: name.toLowerCase(), email: `${name.toLowerCase()}@exemplo.com`, termsVersion: name === 'Ana' ? undefined : LEGAL_VERSION }));
    return { id, as: t.withIdentity({ subject: `${id}|sessao`, name }) };
  };
  return { t, ana: await user('Ana'), bia: await user('Bia') };
}

describe('termos e conta', () => {
  test('aceitar os termos guarda a versão', async () => {
    const { ana } = await setup();
    expect((await ana.as.query(api.users.me, {}))!.termsVersion).toBeNull();
    // aceite de uma versão velha (ou inventada) não vale
    await expect(ana.as.mutation(api.users.acceptTerms, { version: 'qualquer-coisa' })).rejects.toThrow(/termos mudaram/);
    await ana.as.mutation(api.users.acceptTerms, { version: LEGAL_VERSION });
    expect((await ana.as.query(api.users.me, {}))!.termsVersion).toBe(LEGAL_VERSION);
  });

  test('excluir a conta apaga perfil, amigos e estatísticas e tira da partida', async () => {
    const { t, ana, bia } = await setup();
    await ana.as.mutation(api.users.acceptTerms, { version: LEGAL_VERSION });
    const { gameId, code } = await bia.as.mutation(api.games.create, {});
    await ana.as.mutation(api.games.join, { code });
    await t.run(async (ctx) => {
      await ctx.db.insert('friendships', { a: ana.id, b: bia.id, from: ana.id, status: 'accepted', at: Date.now() });
      await ctx.db.insert('player_stats', { userId: ana.id, games: 3, wins: 1, catches: 0, escapes: 1, bestHiddenMs: 0, distanceM: 1200 });
    });
    await ana.as.mutation(api.users.deleteAccount, {});
    await t.run(async (ctx) => {
      expect(await ctx.db.get(ana.id)).toBeNull();
      expect(await ctx.db.query('friendships').collect()).toHaveLength(0);
      expect(await ctx.db.query('player_stats').collect()).toHaveLength(0);
      const players = await ctx.db.query('players').withIndex('by_user', (q) => q.eq('userId', ana.id as Id<'users'>)).collect();
      expect(players.map((p) => [p.name, p.state])).toEqual([['Conta excluída', 'left']]);
    });
    // o lobby de quem ficou continua funcionando
    const lobby = await bia.as.query(api.games.lobby, { gameId });
    expect(lobby).not.toBeNull();
  });
});

describe('código de recuperação', () => {
  test('gerar um código liga ele à conta; gerar outro invalida o anterior', async () => {
    const { t, ana, bia } = await setup();
    expect((await ana.as.query(api.recovery.status, {}))!.has).toBe(false);
    const primeiro = await ana.as.mutation(api.recovery.create, {});
    expect(primeiro).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect((await ana.as.query(api.recovery.status, {}))!.has).toBe(true);
    // aceita minúsculas e sem traços
    expect(await t.query(internal.recovery.userByCode, { code: primeiro.toLowerCase().replace(/-/g, '') })).toBe(ana.id);
    expect(await t.query(internal.recovery.userByCode, { code: 'AAAA-BBBB-CCCC' })).toBeNull();
    const segundo = await ana.as.mutation(api.recovery.create, {});
    expect(await t.query(internal.recovery.userByCode, { code: primeiro })).toBeNull();
    expect(await t.query(internal.recovery.userByCode, { code: segundo })).toBe(ana.id);
    // o código da Bia é só dela
    const daBia = await bia.as.mutation(api.recovery.create, {});
    expect(await t.query(internal.recovery.userByCode, { code: daBia })).toBe(bia.id);
  });
});
