/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { distanceM as distanceBetween } from './lib';
import { assignRoles, planDraw } from './rounds';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const MIN = 60_000;

// Um ponto no centro da zona e outro N metros ao norte.
const CENTER = { lat: -23.5505, lng: -46.6333 };
const north = (m: number) => ({ lat: CENTER.lat + m / 111_320, lng: CENTER.lng });

async function setup() {
  const t = convexTest(schema, modules);
  const user = async (name: string) => {
    const id = await t.run((ctx) => ctx.db.insert('users', { name, username: name.toLowerCase() }));
    return t.withIdentity({ subject: `${id}|sessao`, name });
  };
  const [host, leo, priya, teo] = await Promise.all(['Castro', 'Leo', 'Priya', 'Teo'].map(user));
  return { t, host, leo, priya, teo };
}

type As = Awaited<ReturnType<typeof setup>>['host'];

async function lobbyWith4() {
  const s = await setup();
  const { gameId, code } = await s.host.mutation(api.games.create, {});
  for (const p of [s.leo, s.priya, s.teo]) await p.mutation(api.games.join, { code: code.toLowerCase() });
  await s.host.mutation(api.games.setZone, { gameId, ...CENTER, radius: 210 });
  return { ...s, gameId, code };
}

// Todo mundo confirma o lado no sorteio (o anfitrião já entra pronto).
async function everyoneChooses(s: Awaited<ReturnType<typeof lobbyWith4>>) {
  for (const p of [s.leo, s.priya, s.teo]) await p.mutation(api.games.setSide, { gameId: s.gameId, side: 'draw' });
}

// Força os papéis para o teste ser previsível: Leo caça, o resto corre.
async function startWithLeoHunting(s: Awaited<ReturnType<typeof lobbyWith4>>) {
  await s.host.mutation(api.games.setRules, {
    gameId: s.gameId,
    rules: { durationMin: 30, headStartMin: 3, pingEveryMin: 2, hunters: 1, shrink: true, shrinkEveryMin: 5, spectatorsHelp: false },
  });
  await s.leo.mutation(api.games.setSide, { gameId: s.gameId, side: 'hunter' });
  for (const p of [s.host, s.priya, s.teo]) await p.mutation(api.games.setSide, { gameId: s.gameId, side: 'runner' });
  await s.host.mutation(api.rounds.start, { gameId: s.gameId });
}

// O lobby, para quem está na partida (null é para quem saiu).
const lobbyOf = (as: As, gameId: Id<'games'>) => as.query(api.games.lobby, { gameId }).then((l) => l!);

// A tela do jogo. Nestes testes a pessoa sempre está na partida (null é para quem saiu).
const viewOf = (as: As, gameId: Id<'games'>) => as.query(api.play.view, { gameId }).then((v) => v!);

const move = (as: As, gameId: Id<'games'>, pos: { lat: number; lng: number }) =>
  as.mutation(api.play.sendPosition, { gameId, ...pos, accuracy: 8 });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function advance(t: Awaited<ReturnType<typeof setup>>['t'], ms: number) {
  vi.advanceTimersByTime(ms + 1_000); // +1 s: o horário agendado tem arredondamento
  await t.finishInProgressScheduledFunctions();
}

describe('lobby', () => {
  test('criar, entrar pelo código e ver o lobby', async () => {
    const { host, priya, gameId, code } = await lobbyWith4();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const lobby = await lobbyOf(priya, gameId);
    expect(lobby.players.map((p) => p.name)).toEqual(['Castro', 'Leo', 'Priya', 'Teo']);
    expect(lobby.isHost).toBe(false);
    expect((await lobbyOf(host, gameId)).isHost).toBe(true);
  });

  test('só começa depois que todo mundo fica pronto', async () => {
    const s = await lobbyWith4();
    const lobby = await lobbyOf(s.host, s.gameId);
    expect(lobby.players.filter((p) => p.choosing).map((p) => p.name)).toEqual(['Leo', 'Priya', 'Teo']);
    await expect(s.host.mutation(api.rounds.start, { gameId: s.gameId })).rejects.toThrow(/Esperando Leo, Priya, Teo ficarem prontos/);
    await s.leo.mutation(api.games.setSide, { gameId: s.gameId, side: 'hunter' });
    await s.priya.mutation(api.games.setSide, { gameId: s.gameId, side: 'runner' });
    await expect(s.host.mutation(api.rounds.start, { gameId: s.gameId })).rejects.toThrow(/Esperando Teo ficar pronto/);
    await s.teo.mutation(api.games.setSide, { gameId: s.gameId, side: 'draw' });
    await s.host.mutation(api.rounds.start, { gameId: s.gameId });
    expect((await viewOf(s.teo, s.gameId)).game.status).toBe('headstart');
  });

  test('código errado e partida já começada', async () => {
    const s = await lobbyWith4();
    await expect(s.priya.mutation(api.games.join, { code: 'ZZZZZZ' })).rejects.toThrow();
    await everyoneChooses(s);
    await s.host.mutation(api.rounds.start, { gameId: s.gameId });
    const late = await s.t.run((ctx) => ctx.db.insert('users', { name: 'Sasha' }));
    await expect(s.t.withIdentity({ subject: `${late}|x` }).mutation(api.games.join, { code: s.code })).rejects.toThrow(/IN_PROGRESS/);
  });

  test('quem não está na partida não vê o lobby', async () => {
    const s = await lobbyWith4();
    const stranger = await s.t.run((ctx) => ctx.db.insert('users', { name: 'X' }));
    expect(await s.t.withIdentity({ subject: `${stranger}|x` }).query(api.games.lobby, { gameId: s.gameId })).toBeNull();
  });

  test('só o anfitrião muda regras; valores fora do limite são corrigidos', async () => {
    const s = await lobbyWith4();
    const rules = { durationMin: 999, headStartMin: 0, pingEveryMin: 2, hunters: 9, shrink: true, shrinkEveryMin: 5, spectatorsHelp: true };
    await expect(s.leo.mutation(api.games.setRules, { gameId: s.gameId, rules })).rejects.toThrow(/anfitrião/);
    await s.host.mutation(api.games.setRules, { gameId: s.gameId, rules });
    const lobby = await lobbyOf(s.host, s.gameId);
    expect(lobby.rules).toMatchObject({ durationMin: 60, headStartMin: 1, hunters: 5 });
  });

  test('3 partidas grátis, depois pede a compra', async () => {
    const { host } = await setup();
    for (let i = 0; i < 3; i++) await host.mutation(api.games.create, {});
    await expect(host.mutation(api.games.create, {})).rejects.toThrow(/PAYWALL/);
  });

  test('anfitrião sai do lobby e quem chegou primeiro assume', async () => {
    const s = await lobbyWith4();
    await s.host.mutation(api.games.leave, { gameId: s.gameId });
    expect((await lobbyOf(s.leo, s.gameId)).isHost).toBe(true);
  });
});

describe('sorteio', () => {
  test('respeita quem quer caçar e completa com o sorteio', () => {
    const ps = [
      { _id: 'a', side: 'hunter' },
      { _id: 'b', side: 'draw' },
      { _id: 'c', side: 'runner' },
      { _id: 'd', side: 'runner' },
    ] as never[];
    const roles = assignRoles(ps, 2);
    const hunters = roles.filter((r) => r.role === 'hunter').map((r) => r.id);
    expect(hunters.sort()).toEqual(['a', 'b']);
  });

  test('sempre sobra pelo menos 1 corredor', () => {
    const ps = [{ _id: 'a', side: 'hunter' }, { _id: 'b', side: 'hunter' }] as never[];
    expect(assignRoles(ps, 5).filter((r) => r.role === 'runner')).toHaveLength(1);
  });
});

describe('roleta de luz', () => {
  test('a luz para em quem caça, pula quem já foi e cada passo é mais lento', () => {
    const order = ['a', 'b', 'c', 'd', 'e'] as unknown as Id<'players'>[];
    for (let i = 0; i < 20; i++) {
      const plan = planDraw(order, 2, 1000);
      expect(plan.hunters).toHaveLength(2);
      expect(new Set(plan.hunters).size).toBe(2);
      expect(plan.stops.map((k) => plan.steps[k].p)).toEqual(plan.hunters);
      // no segundo giro a luz não passa pelo primeiro caçador
      expect(plan.steps.slice(plan.stops[0] + 1).some((st) => st.p === plan.hunters[0])).toBe(false);
      const gaps = plan.steps.slice(1, plan.stops[0] + 1).map((st, k) => st.at - plan.steps[k].at);
      expect(gaps.every((g, k) => k === 0 || g >= gaps[k - 1])).toBe(true);
      expect(plan.endAt).toBeGreaterThan(plan.steps[plan.steps.length - 1].at);
    }
  });

  test('anfitrião gira, todo mundo vê o plano e a rodada começa com os caçadores dela', async () => {
    const s = await lobbyWith4();
    await expect(s.host.mutation(api.rounds.spin, { gameId: s.gameId })).rejects.toThrow(/prontos/);
    await everyoneChooses(s);
    await expect(s.leo.mutation(api.rounds.spin, { gameId: s.gameId })).rejects.toThrow();
    await s.host.mutation(api.rounds.spin, { gameId: s.gameId });
    const lobby = await lobbyOf(s.priya, s.gameId);
    expect(lobby.draw).not.toBeNull();
    expect(lobby.draw!.order).toHaveLength(4);
    await expect(s.host.mutation(api.rounds.spin, { gameId: s.gameId })).rejects.toThrow(/girando/);
    const stopsAt = lobby.draw!.stops.map((k) => lobby.draw!.steps[k].id);
    await advance(s.t, lobby.draw!.endAt - Date.now());
    const after = await lobbyOf(s.host, s.gameId);
    expect(after.status).toBe('headstart');
    expect(after.draw).toBeNull();
    const hunters = await s.t.run(async (ctx) =>
      (await ctx.db.query('players').collect()).filter((p) => p.role === 'hunter').map((p) => p._id as string),
    );
    expect(hunters.sort()).toEqual([...stopsAt].sort());
  });
});

describe('rodada', () => {
  test('vantagem, ping e regra de visibilidade', async () => {
    const s = await lobbyWith4();
    await startWithLeoHunting(s);
    const { gameId, t } = s;

    await move(s.leo, gameId, CENTER);
    await move(s.priya, gameId, north(80));
    await move(s.teo, gameId, north(120));
    await move(s.host, gameId, north(40));

    // Corredor vê o próprio time ao vivo e nunca o caçador.
    let runnerView = await viewOf(s.priya, gameId);
    expect(runnerView.game.status).toBe('headstart');
    expect(runnerView.people.map((p) => p.name).sort()).toEqual(['Castro', 'Priya', 'Teo']);

    // Na vantagem o caçador não vê nenhum corredor.
    let hunterView = await viewOf(s.leo, gameId);
    expect(hunterView.people.map((p) => p.name)).toEqual(['Leo']);

    await advance(t, 3 * MIN); // fim da vantagem
    expect((await viewOf(s.leo, gameId)).game.status).toBe('hunt');

    await advance(t, 2 * MIN); // primeiro ping
    hunterView = await viewOf(s.leo, gameId);
    const seen = hunterView.people.filter((p) => !p.isMe);
    expect(seen).toHaveLength(3);
    expect(seen.every((p) => p.kind === 'ping')).toBe(true);

    // Depois do ping o corredor se mexe; o caçador continua vendo a posição velha.
    await move(s.priya, gameId, north(150));
    hunterView = await viewOf(s.leo, gameId);
    const priyaSeen = hunterView.people.find((p) => p.name === 'Priya')!;
    expect(priyaSeen.lat).toBeCloseTo(north(80).lat, 6);

    runnerView = await viewOf(s.priya, gameId);
    expect(runnerView.people.some((p) => p.role === 'hunter')).toBe(false);
  });

  test('fora da zona por 30 s fica visível ao vivo para os caçadores', async () => {
    const s = await lobbyWith4();
    await startWithLeoHunting(s);
    await move(s.priya, s.gameId, north(50));
    await advance(s.t, 3 * MIN);

    await move(s.priya, s.gameId, north(300)); // raio é 210 m
    await advance(s.t, 10_000);
    let priya = (await viewOf(s.leo, s.gameId)).people.find((p) => p.name === 'Priya');
    expect(priya).toBeUndefined(); // ainda não houve ping e não passou 30 s

    await advance(s.t, 21_000);
    priya = (await viewOf(s.leo, s.gameId)).people.find((p) => p.name === 'Priya');
    expect(priya?.kind).toBe('live');

    // Voltou para dentro: some de novo.
    await move(s.priya, s.gameId, north(100));
    priya = (await viewOf(s.leo, s.gameId)).people.find((p) => p.name === 'Priya');
    expect(priya).toBeUndefined();
  });

  test('anti-cheat: salto de GPS é ignorado e marcado', async () => {
    const s = await lobbyWith4();
    await startWithLeoHunting(s);
    await move(s.priya, s.gameId, north(0));
    vi.advanceTimersByTime(3_000);
    const r = await move(s.priya, s.gameId, north(2_000)); // 2 km em 3 s
    expect(r).toMatchObject({ accepted: false, reason: 'jump' });
    const bad = await s.priya.mutation(api.play.sendPosition, { gameId: s.gameId, ...north(5), accuracy: 80 });
    expect(bad).toMatchObject({ accepted: false, reason: 'accuracy' });
  });

  test('zona encolhe com aviso de 1 min', async () => {
    const s = await lobbyWith4();
    await startWithLeoHunting(s);
    await advance(s.t, 3 * MIN + 4 * MIN); // aviso: 1 min antes dos 5 min
    let view = await viewOf(s.priya, s.gameId);
    expect(view.game.nextZoneRadius).toBe(151);
    await advance(s.t, MIN);
    view = await viewOf(s.priya, s.gameId);
    expect(view.game.zone?.radius).toBe(151);
    expect(view.game.nextZoneRadius).toBeNull();
  });

  test('pega: confirmada, contestada e sem resposta', async () => {
    const s = await lobbyWith4();
    await startWithLeoHunting(s);
    const { gameId } = s;
    await move(s.leo, gameId, CENTER);
    for (const [p, m] of [[s.priya, 10], [s.teo, 12], [s.host, 20]] as const) await move(p, gameId, north(m));

    const ids = Object.fromEntries((await lobbyOf(s.leo, gameId)).players.map((p) => [p.name, p.id]));
    await expect(s.leo.mutation(api.play.markCapture, { gameId, runnerId: ids.Priya })).rejects.toThrow(/vantagem/);
    await advance(s.t, 3 * MIN);

    // Priya confirma.
    await s.leo.mutation(api.play.markCapture, { gameId, runnerId: ids.Priya });
    const pending = (await viewOf(s.priya, gameId)).capture!;
    expect(pending.other).toBe('Leo');
    await s.priya.mutation(api.play.answerCapture, { captureId: pending.id, caught: true });
    expect((await viewOf(s.priya, gameId)).me.state).toBe('caught');

    // Teo contesta.
    await s.leo.mutation(api.play.markCapture, { gameId, runnerId: ids.Teo });
    const teoCapture = (await viewOf(s.teo, gameId)).capture!;
    await s.teo.mutation(api.play.answerCapture, { captureId: teoCapture.id, caught: false });
    expect((await viewOf(s.leo, gameId)).disputed).not.toBeNull();
    expect((await viewOf(s.teo, gameId)).me.state).toBe('active');

    // Castro não responde em 60 s: conta como pego.
    await s.leo.mutation(api.play.markCapture, { gameId, runnerId: ids.Castro });
    await advance(s.t, 61_000);
    expect((await viewOf(s.host, gameId)).me.state).toBe('caught');

    // Teo se entrega: acabou, caçador vence.
    await s.teo.mutation(api.play.reportCaught, { gameId });
    const end = await viewOf(s.leo, gameId);
    expect(end.game).toMatchObject({ status: 'ended', winner: 'hunter', endedReason: 'all_tagged' });
  });

  test('pega longe demais é recusada', async () => {
    const s = await lobbyWith4();
    await startWithLeoHunting(s);
    await move(s.leo, s.gameId, CENTER);
    await move(s.priya, s.gameId, north(150));
    await advance(s.t, 3 * MIN);
    const ids = Object.fromEntries((await lobbyOf(s.leo, s.gameId)).players.map((p) => [p.name, p.id]));
    await expect(s.leo.mutation(api.play.markCapture, { gameId: s.gameId, runnerId: ids.Priya })).rejects.toThrow(/150 m/);
  });

  test('coração acelera só para o corredor com caçador a menos de 30 m', async () => {
    const s = await lobbyWith4();
    const { gameId } = s;
    await startWithLeoHunting(s);
    await move(s.leo, gameId, CENTER);
    await move(s.priya, gameId, north(20));
    expect((await viewOf(s.priya, gameId)).me.heartbeat).toBe(false); // ainda na vantagem

    await advance(s.t, 3 * MIN);
    await move(s.leo, gameId, CENTER);
    await move(s.priya, gameId, north(20));
    await move(s.teo, gameId, north(45));
    expect((await viewOf(s.priya, gameId)).me.heartbeat).toBe(true);
    expect((await viewOf(s.teo, gameId)).me.heartbeat).toBe(false);
    expect((await viewOf(s.leo, gameId)).me.heartbeat).toBe(false); // caçador não sabe

    // Posição do caçador velha não conta.
    vi.advanceTimersByTime(61_000);
    await move(s.priya, gameId, north(21));
    expect((await viewOf(s.priya, gameId)).me.heartbeat).toBe(false);
  });

  test('grito: acerta o corredor mais perto, só gasta se acertar, 3 por rodada', async () => {
    const s = await lobbyWith4();
    const { gameId } = s;
    await startWithLeoHunting(s);
    await expect(s.leo.mutation(api.play.shout, { gameId })).rejects.toThrow(/vantagem/);
    await advance(s.t, 3 * MIN);
    await expect(s.priya.mutation(api.play.shout, { gameId })).rejects.toThrow(/caçadores/);

    await move(s.leo, gameId, CENTER);
    await move(s.priya, gameId, north(100));
    expect(await s.leo.mutation(api.play.shout, { gameId })).toEqual({ hit: false, left: 3 });

    await move(s.teo, gameId, north(50));
    await move(s.host, gameId, north(40));
    expect(await s.leo.mutation(api.play.shout, { gameId })).toEqual({ hit: true, left: 2 });
    expect((await viewOf(s.host, gameId)).me.shoutedAt).not.toBeNull();
    expect((await viewOf(s.teo, gameId)).me.shoutedAt).toBeNull();
    expect((await viewOf(s.leo, gameId)).me.shoutsLeft).toBe(2);

    await s.leo.mutation(api.play.shout, { gameId });
    await s.leo.mutation(api.play.shout, { gameId });
    await expect(s.leo.mutation(api.play.shout, { gameId })).rejects.toThrow(/acabaram/);
  });

  test('boosts: aparecem, pegar revela, guarda até 2 e cada um tem seu efeito', async () => {
    const s = await lobbyWith4();
    const { gameId, t } = s;
    await startWithLeoHunting(s);
    await advance(t, 3 * MIN); // fim da vantagem
    await advance(t, MIN); // 1 min de caça: primeira onda
    expect((await viewOf(s.priya, gameId)).boosts).toHaveLength(3);
    const hunterView = await viewOf(s.leo, gameId);
    expect(hunterView.boosts).toHaveLength(0); // caçador não vê onde estão
    expect(hunterView.boostsOnMap).toBe(3);

    // Troca a onda sorteada por boosts em lugares conhecidos.
    await t.run(async (ctx) => {
      const game = (await ctx.db.get(gameId))!;
      for (const b of await ctx.db.query('boosts').collect()) await ctx.db.delete(b._id);
      for (const [kind, m] of [['sombra', 100], ['despiste', 120], ['escudo', 140]] as const) {
        await ctx.db.insert('boosts', { gameId, round: game.round, kind, ...north(m), state: 'map' });
      }
    });
    const step = async (m: number) => {
      vi.advanceTimersByTime(2_500);
      await move(s.priya, gameId, north(m));
    };
    const priyaSeen = async () => (await viewOf(s.leo, gameId)).people.find((p) => p.name === 'Priya');

    await step(100);
    let v = await viewOf(s.priya, gameId);
    expect(v.me.boosts.map((b) => b.kind)).toEqual(['sombra']);
    expect(v.me.revealUntil).not.toBeNull();
    expect((await priyaSeen())?.kind).toBe('live'); // o preço: 5 s ao vivo
    await advance(t, 5_000);
    expect((await priyaSeen())?.kind).not.toBe('live');

    await step(120);
    await advance(t, 2_000);
    await step(140); // já tem 2: o Escudo fica travado
    v = await viewOf(s.priya, gameId);
    expect(v.me.boosts.map((b) => b.kind)).toEqual(['sombra', 'despiste']);
    expect(v.me.blockedBoost).toBe('Escudo');

    // Sombra: some do próximo ping (aos 5 min).
    await s.priya.mutation(api.play.useBoost, { boostId: v.me.boosts[0].id });
    await advance(t, 50_000);
    expect(await priyaSeen()).toBeUndefined();

    // Despiste: o ping seguinte sai a 60 m de onde ela está.
    await s.priya.mutation(api.play.useBoost, { boostId: v.me.boosts[1].id });
    await advance(t, 2 * MIN);
    const ping = await priyaSeen();
    expect(Math.round(distanceBetween(ping!, north(140)))).toBe(60);

    // Abriu espaço: pega o Escudo e fica protegida da pega.
    await step(141);
    await advance(t, 9_000);
    v = await viewOf(s.priya, gameId);
    expect(v.me.boosts.map((b) => b.kind)).toEqual(['escudo']);
    await s.priya.mutation(api.play.useBoost, { boostId: v.me.boosts[0].id });
    const ids = Object.fromEntries((await lobbyOf(s.leo, gameId)).players.map((p) => [p.name, p.id]));
    await expect(s.leo.mutation(api.play.markCapture, { gameId, runnerId: ids.Priya })).rejects.toThrow(/Escudo/);
    await expect(s.priya.mutation(api.play.useBoost, { boostId: v.me.boosts[0].id })).rejects.toThrow();
  });

  test('tempo acaba com corredor livre: corredores vencem', async () => {
    const s = await lobbyWith4();
    await startWithLeoHunting(s);
    await advance(s.t, 33 * MIN);
    const view = await viewOf(s.priya, s.gameId);
    expect(view.game).toMatchObject({ status: 'ended', winner: 'runner', endedReason: 'time' });
    const stats = await s.t.run((ctx) => ctx.db.query('match_stats').collect());
    expect(stats).toHaveLength(1);
  });

  test('revanche começa rodada 2 e ignora agendamentos da rodada 1', async () => {
    const s = await lobbyWith4();
    await startWithLeoHunting(s);
    await s.teo.mutation(api.play.reportCaught, { gameId: s.gameId });
    await s.priya.mutation(api.play.reportCaught, { gameId: s.gameId });
    await s.host.mutation(api.play.reportCaught, { gameId: s.gameId });
    await s.host.mutation(api.rounds.start, { gameId: s.gameId });
    await advance(s.t, 3 * MIN);
    const view = await viewOf(s.priya, s.gameId);
    expect(view.game).toMatchObject({ round: 2, status: 'hunt' });
    expect(view.me.state).toBe('active');
  });
});

describe('fui pego', () => {
  test('o corredor diz quem pegou; caçador de mentira é ignorado', async () => {
    const s = await lobbyWith4();
    await startWithLeoHunting(s);
    const v = await viewOf(s.priya, s.gameId);
    expect(v.hunters.map((h) => h.name)).toEqual(['Leo']);
    await advance(s.t, 3 * MIN);
    const teoId = (await viewOf(s.teo, s.gameId)).me.id;
    await s.teo.mutation(api.play.reportCaught, { gameId: s.gameId, hunterId: teoId });
    await s.priya.mutation(api.play.reportCaught, { gameId: s.gameId, hunterId: v.hunters[0].id });
    const rows = await s.t.run((ctx) => ctx.db.query('players').collect());
    expect(rows.find((p) => p.name === 'Priya')!.caughtBy).toBe(v.hunters[0].id);
    expect(rows.find((p) => p.name === 'Teo')!.caughtBy).toBeUndefined();
    const radio = await s.host.query(api.radio.list, { gameId: s.gameId });
    expect(radio.messages.some((m) => m.text?.startsWith('Leo pegou Priya'))).toBe(true);
  });
});

describe('radio', () => {
  test('só respostas prontas, por time, com limite de ritmo', async () => {
    const s = await lobbyWith4();
    await startWithLeoHunting(s);
    await expect(s.priya.mutation(api.radio.sendQuick, { gameId: s.gameId, text: 'qualquer coisa' })).rejects.toThrow(/não permitida/);
    await s.priya.mutation(api.radio.sendQuick, { gameId: s.gameId, text: 'Tô escondido' });
    await expect(s.priya.mutation(api.radio.sendQuick, { gameId: s.gameId, text: 'Tô indo' })).rejects.toThrow(/Devagar/);
    await s.leo.mutation(api.radio.sendQuick, { gameId: s.gameId, text: 'Achei um!' });

    const runnerMsgs = (await s.teo.query(api.radio.list, { gameId: s.gameId })).messages.filter((m) => m.kind === 'quick');
    expect(runnerMsgs.map((m) => m.text)).toEqual(['Tô escondido']);
    const hunterMsgs = (await s.leo.query(api.radio.list, { gameId: s.gameId })).messages.filter((m) => m.kind === 'quick');
    expect(hunterMsgs.map((m) => m.text)).toEqual(['Achei um!']);
  });

  test('quem foi pego não fala se a regra não deixar', async () => {
    const s = await lobbyWith4();
    await startWithLeoHunting(s);
    await s.priya.mutation(api.play.reportCaught, { gameId: s.gameId });
    await expect(s.priya.mutation(api.radio.sendQuick, { gameId: s.gameId, text: 'Tô indo' })).rejects.toThrow(/só assiste/);
  });
});

describe('salvar o amigo', () => {
  test('pego fica preso no lugar; corredor perto por 3 s solta', async () => {
    const s = await lobbyWith4();
    const { gameId } = s;
    await startWithLeoHunting(s);
    await advance(s.t, 3 * MIN);
    await move(s.leo, gameId, CENTER);
    await move(s.priya, gameId, north(100));
    await move(s.teo, gameId, north(160));
    await s.priya.mutation(api.play.reportCaught, { gameId });

    // Todo mundo vê onde ela está presa, inclusive o caçador.
    const seen = (await viewOf(s.leo, gameId)).people.find((p) => p.name === 'Priya');
    expect(seen).toMatchObject({ kind: 'live', state: 'caught' });
    expect(Math.round(distanceBetween(seen!, north(100)))).toBe(0);
    expect((await viewOf(s.priya, gameId)).me.jailed).toBe(true);

    // O preso pode pedir ajuda mesmo quando pego só assiste.
    await s.priya.mutation(api.radio.sendQuick, { gameId, text: 'Me salva!' });

    // Teo chega a 5 m: começa o resgate; 3 s depois, os dois estão no jogo.
    vi.advanceTimersByTime(2_500);
    await move(s.teo, gameId, north(105));
    expect((await viewOf(s.teo, gameId)).me.rescue?.name).toBe('Priya');
    vi.advanceTimersByTime(3_500);
    await move(s.teo, gameId, north(104));
    const priya = await viewOf(s.priya, gameId);
    expect(priya.me.state).toBe('active');
    expect(priya.me.jailed).toBe(false);
    expect(priya.me.shieldUntil).not.toBeNull(); // protegida por 30 s
    expect((await viewOf(s.teo, gameId)).me.rescue).toBeNull();
  });

  test('sair do círculo recomeça o resgate', async () => {
    const s = await lobbyWith4();
    const { gameId } = s;
    await startWithLeoHunting(s);
    await advance(s.t, 3 * MIN);
    await move(s.priya, gameId, north(100));
    await move(s.teo, gameId, north(108));
    await s.priya.mutation(api.play.reportCaught, { gameId });
    vi.advanceTimersByTime(2_500);
    await move(s.teo, gameId, north(106)); // começa
    vi.advanceTimersByTime(2_500);
    await move(s.teo, gameId, north(130)); // saiu
    vi.advanceTimersByTime(2_500);
    await move(s.teo, gameId, north(106)); // recomeça do zero
    expect((await viewOf(s.priya, gameId)).me.state).toBe('caught');
  });
});

describe('regras de boosts e tensão', () => {
  test('anfitrião desliga boosts, coração, grito e resgate', async () => {
    const s = await lobbyWith4();
    const { gameId } = s;
    await s.host.mutation(api.games.setRules, {
      gameId,
      rules: {
        durationMin: 30, headStartMin: 3, pingEveryMin: 2, hunters: 1, shrink: true, shrinkEveryMin: 5, spectatorsHelp: false,
        boosts: false, heartbeat: false, shouts: false, rescue: false,
      },
    });
    await s.leo.mutation(api.games.setSide, { gameId, side: 'hunter' });
    for (const p of [s.host, s.priya, s.teo]) await p.mutation(api.games.setSide, { gameId, side: 'runner' });
    await s.host.mutation(api.rounds.start, { gameId });
    await advance(s.t, 3 * MIN);
    await advance(s.t, MIN);
    await move(s.leo, gameId, CENTER);
    await move(s.priya, gameId, north(10));

    const priya = await viewOf(s.priya, gameId);
    expect(priya.boosts).toHaveLength(0); // nenhuma onda
    expect(priya.me.heartbeat).toBe(false); // caçador a 10 m, mas desligado
    expect(priya.game.features).toEqual({ boosts: false, heartbeat: false, shouts: false, rescue: false });
    expect((await viewOf(s.leo, gameId)).me.shoutsLeft).toBeNull();
    await expect(s.leo.mutation(api.play.shout, { gameId })).rejects.toThrow(/desligado/);

    await s.priya.mutation(api.play.reportCaught, { gameId });
    expect((await viewOf(s.priya, gameId)).me.jailed).toBe(false); // sem prisão: pego é pego
  });

  test('quantidade de boosts por onda', async () => {
    const s = await lobbyWith4();
    await s.host.mutation(api.games.setRules, {
      gameId: s.gameId,
      rules: { durationMin: 30, headStartMin: 3, pingEveryMin: 2, hunters: 1, shrink: true, shrinkEveryMin: 5, spectatorsHelp: false, boostAmount: 'many' },
    });
    await everyoneChooses(s);
    await s.host.mutation(api.rounds.start, { gameId: s.gameId });
    await advance(s.t, 3 * MIN);
    await advance(s.t, MIN);
    const runner = (await Promise.all([s.host, s.leo, s.priya, s.teo].map((p) => viewOf(p, s.gameId)))).find((v) => v.me.role === 'runner')!;
    expect(runner.boosts).toHaveLength(5);
  });
});

describe('sair da partida', () => {
  test('quem sai recebe tela vazia, não erro, e a partida segue', async () => {
    const s = await lobbyWith4();
    const { gameId } = s;
    await startWithLeoHunting(s);
    await s.priya.mutation(api.games.leave, { gameId });
    // As telas que ficam abertas por baixo não podem quebrar.
    expect(await s.priya.query(api.play.view, { gameId })).toBeNull();
    expect(await s.priya.query(api.games.lobby, { gameId })).toBeNull();
    expect((await s.priya.query(api.radio.list, { gameId })).messages).toEqual([]);
    expect(await s.priya.query(api.alerts.mine, { gameId })).toEqual([]);
    // Os outros seguem jogando.
    expect((await viewOf(s.teo, gameId)).game.status).toBe('headstart');
  });
});

describe('avisos da partida', () => {
  const kinds = async (as: As, gameId: Id<'games'>) => (await as.query(api.alerts.mine, { gameId })).map((a) => a.kind);

  test('começo, caçada liberada, ping e fim chegam para quem deve', async () => {
    const s = await lobbyWith4();
    const { gameId } = s;
    await startWithLeoHunting(s);
    expect(await kinds(s.priya, gameId)).toEqual(['start']);
    expect((await s.leo.query(api.alerts.mine, { gameId }))[0].title).toMatch(/você caça/);

    await advance(s.t, 3 * MIN); // fim da vantagem
    expect(await kinds(s.leo, gameId)).toEqual(['hunt', 'start']);
    await advance(s.t, 2 * MIN); // primeiro ping
    expect((await kinds(s.priya, gameId))[0]).toBe('ping');

    await advance(s.t, 30 * MIN); // acaba o tempo
    expect((await kinds(s.priya, gameId))[0]).toBe('end');
  });

  test('coração acelerado avisa uma vez por minuto, grito e pega avisam o corredor', async () => {
    const s = await lobbyWith4();
    const { gameId } = s;
    await startWithLeoHunting(s);
    await advance(s.t, 3 * MIN);
    await move(s.priya, gameId, north(20));
    await move(s.leo, gameId, CENTER); // o caçador chega perto
    expect((await kinds(s.priya, gameId))[0]).toBe('heartbeat');
    vi.advanceTimersByTime(2_500);
    await move(s.leo, gameId, north(5)); // ainda perto: não repete
    expect((await kinds(s.priya, gameId)).filter((k) => k === 'heartbeat')).toHaveLength(1);
    expect(await kinds(s.teo, gameId)).not.toContain('heartbeat'); // longe

    await s.leo.mutation(api.play.shout, { gameId });
    expect((await kinds(s.priya, gameId))[0]).toBe('shout');

    const ids = Object.fromEntries((await lobbyOf(s.leo, gameId)).players.map((p) => [p.name, p.id]));
    await s.leo.mutation(api.play.markCapture, { gameId, runnerId: ids.Priya });
    const last = (await s.priya.query(api.alerts.mine, { gameId }))[0];
    expect(last).toMatchObject({ kind: 'capture', title: 'Leo disse que te pegou' });
  });
});

describe('cosméticos', () => {
  test('equipa só o que tem e a moldura aparece no mapa', async () => {
    const s = await lobbyWith4();
    const shop = await s.host.query(api.cosmetics.shop, {});
    expect(shop.items.filter((i) => i.owned).map((i) => i.id)).toEqual(['neon', 'arcoiris']);
    await expect(s.host.mutation(api.cosmetics.equip, { itemId: 'gelo' })).rejects.toThrow(/não é sua/);

    // Compra registrada (como o webhook da loja faria).
    const hostId = (await lobbyOf(s.host, s.gameId)).players.find((p) => p.name === 'Castro')!;
    await s.t.run(async (ctx) => {
      const player = await ctx.db.get(hostId.id);
      await ctx.db.insert('cosmetics', { userId: player!.userId, itemId: 'gelo', at: Date.now() });
    });
    await s.host.mutation(api.cosmetics.equip, { itemId: 'gelo' });
    expect((await s.host.query(api.cosmetics.shop, {})).frame).toBe('gelo');

    await startWithLeoHunting(s);
    await move(s.host, s.gameId, north(10));
    await move(s.priya, s.gameId, north(20));
    const me = (await viewOf(s.priya, s.gameId)).people.find((p) => p.name === 'Castro');
    expect(me?.frame).toBe('gelo');
  });
});

test('limpeza apaga a partida depois de 7 dias', async () => {
  const s = await lobbyWith4();
  await advance(s.t, 7 * 24 * 60 * MIN + 1);
  expect(await s.t.run((ctx) => ctx.db.get(s.gameId))).toBeNull();
  expect(await s.t.run((ctx) => ctx.db.query('players').collect())).toHaveLength(0);
});
