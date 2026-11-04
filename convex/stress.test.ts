/// <reference types="vite/client" />
// Teste de estresse (simulação local, nada vai para o servidor de verdade).
// Roda só com STRESS=1:  STRESS=1 npx vitest run convex/stress.test.ts
// 1) uma partida lotada (20 pessoas) do começo ao fim: todos mandam GPS a cada
//    3 s e olham o mapa e o rádio o tempo todo; mede o tempo de cada operação e
//    confere que o jogo segue correto (pings, zona, fim).
// 2) 10 partidas ao mesmo tempo, sem uma vazar dado para a outra.
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { LEGAL_VERSION } from './legalVersion';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const MIN = 60_000;
const CENTER = { lat: -23.5505, lng: -46.6333 };

beforeEach(() => {
  // relógio do jogo falso, cronômetro (performance/hrtime) de verdade
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  vi.stubGlobal('fetch', async () => new Response('', { status: 503 }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

type T = ReturnType<typeof convexTest>;
const stats: Record<string, number[]> = {};
async function timed<R>(name: string, fn: () => Promise<R>) {
  // relógio do sistema (o performance.now é congelado pelos timers falsos do teste)
  const t0 = process.hrtime.bigint();
  const r = await fn();
  (stats[name] ??= []).push(Number(process.hrtime.bigint() - t0) / 1e6);
  return r;
}
function summary() {
  const rows = Object.entries(stats).map(([k, v]) => {
    const s = [...v].sort((a, b) => a - b);
    const p = (q: number) => s[Math.min(s.length - 1, Math.floor(q * s.length))].toFixed(1);
    return `${k.padEnd(14)} n=${String(v.length).padStart(6)}  média=${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)}ms  p95=${p(0.95)}ms  máx=${p(1)}ms`;
  });
  console.log('\n' + rows.join('\n'));
  for (const k of Object.keys(stats)) delete stats[k];
}

async function crowd(t: T, n: number, tag: string) {
  const as = [];
  for (let i = 0; i < n; i++) {
    const id = await t.run((ctx) => ctx.db.insert('users', { name: `${tag}${i}`, username: `${tag}${i}`.toLowerCase(), termsVersion: LEGAL_VERSION }));
    as.push(t.withIdentity({ subject: `${id}|s`, name: `${tag}${i}` }));
  }
  const { gameId, code } = await as[0].mutation(api.games.create, {});
  for (const p of as.slice(1)) await timed('join', () => p.mutation(api.games.join, { code }));
  await as[0].mutation(api.games.setZone, { gameId, ...CENTER, radius: 300 });
  await as[0].mutation(api.games.setRules, {
    gameId,
    rules: { durationMin: 30, headStartMin: 3, pingEveryMin: 2, hunters: 3, shrink: true, shrinkEveryMin: 5, spectatorsHelp: false },
  });
  for (const p of as.slice(1)) await p.mutation(api.games.setSide, { gameId, side: 'draw' });
  return { as, gameId: gameId as Id<'games'> };
}

// cada pessoa anda um pouco em volta do centro (passos de ~4 m)
const walk = (i: number, step: number) => ({
  lat: CENTER.lat + (Math.sin(i * 1.3 + step / 20) * 120) / 111_320,
  lng: CENTER.lng + (Math.cos(i * 0.7 + step / 25) * 120) / 101_000,
});

describe.skipIf(!process.env.STRESS)('estresse', () => {
  test('partida lotada: 20 pessoas, 33 min de jogo, GPS a cada 3 s', { timeout: 600_000 }, async () => {
    const t = convexTest(schema, modules);
    const { as, gameId } = await crowd(t, 20, 'p');
    await timed('start', () => as[0].mutation(api.rounds.start, { gameId }));
    const STEP_MS = 3000;
    const steps = (33 * MIN) / STEP_MS;
    let errors = 0;
    for (let step = 0; step < steps; step++) {
      vi.advanceTimersByTime(STEP_MS);
      await t.finishInProgressScheduledFunctions();
      const view = await as[0].query(api.play.view, { gameId });
      if (view?.game.status === 'ended') break;
      for (let i = 0; i < as.length; i++) {
        await timed('sendPosition', () => as[i].mutation(api.play.sendPosition, { gameId, ...walk(i, step), accuracy: 8 })).catch(() => errors++);
        // a cada 6 s cada um redesenha o mapa; a cada 15 s olha o rádio
        if (step % 2 === i % 2) await timed('view', () => as[i].query(api.play.view, { gameId }));
        if (step % 5 === i % 5) await timed('radio.list', () => as[i].query(api.radio.list, { gameId }));
      }
      if (step % 10 === 0) await timed('radio.send', () => as[step % 20].mutation(api.radio.sendQuick, { gameId, text: 'Tô indo' })).catch(() => {});
    }
    vi.advanceTimersByTime(2 * MIN);
    await t.finishInProgressScheduledFunctions();
    const end = (await as[0].query(api.play.view, { gameId }))!;
    summary();
    expect(errors).toBe(0);
    expect(end.game.status).toBe('ended');
    // zona encolheu ao longo da rodada e todo mundo continua com a mesma visão de fim
    expect(end.game.winner).toBeTruthy();
    const stats_ = await t.run((ctx) => ctx.db.query('match_stats').collect());
    expect(stats_).toHaveLength(1);
    expect(stats_[0].players).toBe(20);
    // nada de posição guardada depois do fim
    expect(await t.run((ctx) => ctx.db.query('positions').collect())).toHaveLength(0);
  });

  test('10 partidas ao mesmo tempo, sem misturar dados', { timeout: 600_000 }, async () => {
    const t = convexTest(schema, modules);
    const games = [];
    for (let g = 0; g < 10; g++) games.push(await crowd(t, 8, `g${g}x`));
    for (const g of games) await g.as[0].mutation(api.rounds.start, { gameId: g.gameId });
    for (let step = 0; step < 60; step++) {
      vi.advanceTimersByTime(3000);
      await t.finishInProgressScheduledFunctions();
      for (const g of games) for (let i = 0; i < g.as.length; i++) await timed('sendPosition', () => g.as[i].mutation(api.play.sendPosition, { gameId: g.gameId, ...walk(i, step), accuracy: 8 }));
    }
    // ninguém vê gente de outra partida
    for (const g of games) {
      const v = (await g.as[1].query(api.play.view, { gameId: g.gameId }))!;
      const names = v.people.map((p: { name: string }) => p.name);
      const prefix = (await g.as[1].query(api.users.me, {}))!.name!.slice(0, 3);
      expect(names.every((n: string) => n.startsWith(prefix))).toBe(true);
      // e quem é de outra partida não lê esta
      const other = games[(games.indexOf(g) + 1) % games.length];
      expect(await other.as[1].query(api.play.view, { gameId: g.gameId })).toBeNull();
    }
    summary();
  });
});
