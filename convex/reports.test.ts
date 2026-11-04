/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from './_generated/api';
import { LEGAL_VERSION } from './legalVersion';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', async () => new Response('', { status: 503 }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function setup() {
  const t = convexTest(schema, modules);
  const user = async (name: string) => {
    const id = await t.run((ctx) => ctx.db.insert('users', { name, username: name.toLowerCase(), termsVersion: LEGAL_VERSION }));
    return { id, as: t.withIdentity({ subject: `${id}|sessao`, name }) };
  };
  const [ana, bia, caio] = await Promise.all(['Ana', 'Bia', 'Caio'].map(user));
  const { gameId, code } = await ana.as.mutation(api.games.create, {});
  await bia.as.mutation(api.games.join, { code });
  const lobby = await ana.as.query(api.games.lobby, { gameId });
  const idOf = (name: string) => lobby!.players.find((p) => p.name === name)!.id;
  return { t, ana, bia, caio, gameId, code, idOf };
}

describe('denúncia e bloqueio', () => {
  test('denúncia fica guardada sem avisar o denunciado, e o motivo precisa ser da lista', async () => {
    const s = await setup();
    await expect(s.ana.as.mutation(api.reports.create, { gameId: s.gameId, playerId: s.idOf('Bia'), reason: 'qualquer', block: false })).rejects.toThrow(/Escolha/);
    await expect(s.ana.as.mutation(api.reports.create, { gameId: s.gameId, playerId: s.idOf('Ana'), reason: 'Outra coisa', block: false })).rejects.toThrow(/você/);
    const r = await s.ana.as.mutation(api.reports.create, { gameId: s.gameId, playerId: s.idOf('Bia'), reason: 'Mensagens ofensivas no Radio', details: 'x'.repeat(500), block: false });
    expect(r).toMatchObject({ ok: true, duplicate: false });
    const list = await s.t.query(internal.reports.recent, {});
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ denunciado: 'Bia (@bia)', quemDenunciou: 'Ana (@ana)', motivo: 'Mensagens ofensivas no Radio' });
    expect(list[0].detalhes!.length).toBe(300);
    // de novo na mesma partida: não duplica
    expect(await s.ana.as.mutation(api.reports.create, { gameId: s.gameId, playerId: s.idOf('Bia'), reason: 'Outra coisa', block: false })).toMatchObject({ duplicate: true });
    expect(await s.t.query(internal.reports.recent, {})).toHaveLength(1);
  });

  test('quem não está na partida não denuncia ninguém dela', async () => {
    const s = await setup();
    await expect(s.caio.as.mutation(api.reports.create, { gameId: s.gameId, playerId: s.idOf('Bia'), reason: 'Outra coisa', block: false })).rejects.toThrow();
  });

  test('bloquear: não caem na mesma partida, não viram amigos e somem do rádio; desbloquear desfaz', async () => {
    const s = await setup();
    await s.bia.as.mutation(api.radio.sendQuick, { gameId: s.gameId, text: (await s.bia.as.query(api.radio.list, { gameId: s.gameId })).quick[0] }).catch(() => {});
    await s.ana.as.mutation(api.reports.create, { gameId: s.gameId, playerId: s.idOf('Bia'), reason: 'Outra coisa', block: true });
    expect((await s.ana.as.query(api.reports.blocked, {})).map((b) => b.username)).toEqual(['bia']);
    // as mensagens da Bia somem do rádio da Ana
    const radio = await s.ana.as.query(api.radio.list, { gameId: s.gameId });
    expect(radio.messages.filter((m) => m.from?.name === 'Bia')).toHaveLength(0);
    // nova partida da Ana: a Bia não entra (nem a Ana entra numa da Bia)
    await s.bia.as.mutation(api.games.leave, { gameId: s.gameId });
    await s.ana.as.mutation(api.games.leave, { gameId: s.gameId });
    const nova = await s.ana.as.mutation(api.games.create, {});
    // o bloqueio aparece como partida não encontrada (não revela quem bloqueou)
    await expect(s.bia.as.mutation(api.games.join, { code: nova.code })).rejects.toThrow(/NOT_FOUND/);
    // o pedido de amizade parece enviado, mas não chega
    expect(await s.bia.as.mutation(api.friends.request, { userId: s.ana.id })).toBe('sent');
    expect((await s.ana.as.query(api.friends.list, {})).incoming).toHaveLength(0);
    // desbloquear
    await s.ana.as.mutation(api.reports.unblock, { userId: s.bia.id });
    expect(await s.ana.as.query(api.reports.blocked, {})).toHaveLength(0);
    await s.bia.as.mutation(api.games.join, { code: nova.code });
  });

  test('no máximo 20 denúncias por dia', async () => {
    const s = await setup();
    // 20 denúncias da Ana hoje (sobre o Caio)
    await s.t.run(async (ctx) => {
      for (let i = 0; i < 20; i++) await ctx.db.insert('reports', { reporterId: s.ana.id, targetId: s.caio.id, gameId: s.gameId, reason: 'Outra coisa', context: [], at: Date.now() - i, status: 'open' });
    });
    await expect(s.ana.as.mutation(api.reports.create, { gameId: s.gameId, playerId: s.idOf('Bia'), reason: 'Outra coisa', block: false })).rejects.toThrow(/muitas denúncias/);
  });

  test('bloquear desfaz a amizade: o bloqueado não vê mais quando a pessoa joga', async () => {
    const s = await setup();
    await s.ana.as.mutation(api.friends.request, { userId: s.bia.id });
    await s.bia.as.mutation(api.friends.respond, { userId: s.ana.id, accept: true });
    expect((await s.bia.as.query(api.friends.profile, { username: 'ana' }))!.live).not.toBeNull();
    await s.ana.as.mutation(api.reports.block, { gameId: s.gameId, playerId: s.idOf('Bia') });
    expect((await s.bia.as.query(api.friends.list, {})).friends).toHaveLength(0);
    expect((await s.bia.as.query(api.friends.profile, { username: 'ana' }))!.live).toBeNull();
  });

  test('quem já saiu da partida ainda pode denunciar e bloquear', async () => {
    const s = await setup();
    await s.ana.as.mutation(api.games.leave, { gameId: s.gameId });
    expect(await s.ana.as.mutation(api.reports.create, { gameId: s.gameId, playerId: s.idOf('Bia'), reason: 'Outra coisa', block: true })).toMatchObject({ ok: true });
    expect(await s.ana.as.query(api.reports.target, { gameId: s.gameId, playerId: s.idOf('Bia') })).toEqual({ name: 'Bia' });
  });

  test('pedido pendente aceito depois do bloqueio não vira amizade', async () => {
    const s = await setup();
    await s.bia.as.mutation(api.friends.request, { userId: s.ana.id });
    await s.bia.as.mutation(api.reports.block, { gameId: s.gameId, playerId: s.idOf('Ana') });
    await s.ana.as.mutation(api.friends.respond, { userId: s.bia.id, accept: true });
    expect((await s.ana.as.query(api.friends.list, {})).friends).toHaveLength(0);
  });

  test('a limpeza diária apaga denúncias com mais de 6 meses', async () => {
    const s = await setup();
    await s.t.run(async (ctx) => {
      await ctx.db.insert('reports', { reporterId: s.ana.id, targetId: s.bia.id, gameId: s.gameId, reason: 'Outra coisa', context: [], at: Date.now() - 181 * 24 * 60 * 60 * 1000, status: 'open' });
      await ctx.db.insert('reports', { reporterId: s.ana.id, targetId: s.bia.id, gameId: s.gameId, reason: 'Outra coisa', context: [], at: Date.now(), status: 'open' });
    });
    await s.t.mutation(internal.reports.prune, {});
    expect(await s.t.query(internal.reports.recent, {})).toHaveLength(1);
  });

  test('pedido para quem bloqueou aparece como enviado em todo lugar, e quem bloqueou nunca vê', async () => {
    const s = await setup();
    await s.ana.as.mutation(api.reports.block, { gameId: s.gameId, playerId: s.idOf('Bia') });
    expect(await s.bia.as.mutation(api.friends.request, { userId: s.ana.id })).toBe('sent');
    expect((await s.bia.as.query(api.friends.find, { username: 'ana' }))!.status).toBe('sent');
    expect((await s.bia.as.query(api.friends.profile, { username: 'ana' }))!.status).toBe('sent');
    expect((await s.bia.as.query(api.friends.list, {})).outgoing).toHaveLength(1);
    expect((await s.ana.as.query(api.friends.list, {})).incoming).toHaveLength(0);
    // e se a Ana tinha pedido antes, o pedido da Bia não vira amizade
    expect((await s.ana.as.query(api.friends.list, {})).friends).toHaveLength(0);
  });
});
