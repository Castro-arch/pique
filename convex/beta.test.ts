/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from './_generated/api';
import schema from './schema';
import { LEGAL_VERSION } from './legalVersion';

const modules = import.meta.glob('./**/*.ts');

async function setup() {
  const t = convexTest(schema, modules);
  const user = async (name: string, email?: string) => {
    const id = await t.run((ctx) => ctx.db.insert('users', { name, username: name.toLowerCase(), email, termsVersion: LEGAL_VERSION }));
    return t.withIdentity({ subject: `${id}|sessao`, name });
  };
  const ana = await user('Ana');
  const bia = await user('Bia');
  const dono = await user('Dono', 'dono@exemplo.com');
  return { t, ana, bia, dono };
}

afterEach(() => vi.unstubAllEnvs());

describe('convite do teste fechado', () => {
  test('sem código criado, o app fica aberto', async () => {
    const { ana } = await setup();
    expect((await ana.query(api.users.me, {}))!.betaOk).toBe(true);
    await ana.mutation(api.games.create, {});
  });

  test('com código, só entra quem digita; código errado não vale', async () => {
    const { t, ana } = await setup();
    const code = await t.mutation(internal.beta.createCode, { code: 'pique-1' });
    expect(code).toBe('PIQUE1');
    expect((await ana.query(api.users.me, {}))!.betaRevoked).toBe(false);
    expect((await ana.query(api.users.me, {}))!.betaOk).toBe(false);
    await expect(ana.mutation(api.games.create, {})).rejects.toThrow(/convite/);
    expect(await ana.mutation(api.beta.redeem, { code: 'XXXX' })).toMatchObject({ ok: false, error: expect.stringMatching(/inválido/) });
    await ana.mutation(api.beta.redeem, { code: ' pique1 ' });
    expect((await ana.query(api.users.me, {}))!.betaOk).toBe(true);
    await ana.mutation(api.games.create, {});
  });

  test('código novo revoga quem entrou com o anterior', async () => {
    const { t, ana, bia } = await setup();
    const primeiro = await t.mutation(internal.beta.createCode, {});
    await ana.mutation(api.beta.redeem, { code: primeiro });
    const segundo = await t.mutation(internal.beta.createCode, {});
    expect(segundo).not.toBe(primeiro);
    expect((await ana.query(api.users.me, {}))!.betaOk).toBe(false);
    expect((await ana.query(api.users.me, {}))!.betaRevoked).toBe(true);
    expect(await ana.mutation(api.beta.redeem, { code: primeiro })).toMatchObject({ ok: false });
    await bia.mutation(api.beta.redeem, { code: segundo });
    expect((await bia.query(api.users.me, {}))!.betaOk).toBe(true);
  });

  test('quem administra nunca é barrado e troca o código pelo app', async () => {
    vi.stubEnv('BETA_ADMINS', 'dono@exemplo.com');
    const { t, ana, dono } = await setup();
    await t.mutation(internal.beta.createCode, { code: 'ABCD12' });
    const me = (await dono.query(api.users.me, {}))!;
    expect(me.betaOk).toBe(true);
    expect(me.betaAdmin).toBe(true);
    expect((await dono.query(api.beta.adminView, {}))!.code).toBe('ABCD12');
    expect(await ana.query(api.beta.adminView, {})).toBeNull();
    await expect(ana.mutation(api.beta.rotate, {})).rejects.toThrow(/administra/);
    const novo = await dono.mutation(api.beta.rotate, {});
    expect((await dono.query(api.beta.adminView, {}))!.code).toBe(novo);
  });

  test('quem administra pode ser o id da conta (conta sem e-mail), nunca o @', async () => {
    const { t, ana, bia } = await setup();
    const anaId = (await ana.query(api.users.me, {}))!._id;
    vi.stubEnv('BETA_ADMINS', `outro@exemplo.com, ${anaId}`);
    await t.mutation(internal.beta.createCode, {});
    expect((await ana.query(api.users.me, {}))!.betaAdmin).toBe(true);
    expect((await bia.query(api.users.me, {}))!.betaOk).toBe(false);
    // o @ de um admin não dá acesso a quem pegar o mesmo @
    vi.stubEnv('BETA_ADMINS', 'outro@exemplo.com, @bia');
    expect((await bia.query(api.users.me, {}))!.betaAdmin).toBe(false);
    expect((await bia.query(api.users.me, {}))!.betaOk).toBe(false);
  });

  test('depois de 10 erros na hora, o convite certo também é recusado', async () => {
    const { t, ana } = await setup();
    await t.mutation(internal.beta.createCode, { code: 'PIQUE1' });
    for (let i = 0; i < 10; i++) expect(await ana.mutation(api.beta.redeem, { code: 'ERRADO' })).toMatchObject({ ok: false });
    expect(await ana.mutation(api.beta.redeem, { code: 'PIQUE1' })).toMatchObject({ ok: false, error: expect.stringMatching(/Muitas tentativas/) });
    expect((await ana.query(api.users.me, {}))!.betaOk).toBe(false);
  });
});
