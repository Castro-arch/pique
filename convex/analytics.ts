import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalAction, type MutationCtx } from './_generated/server';

// Analytics (PostHog). Os eventos da partida saem daqui do servidor, que é a
// fonte confiável (não depende do celular nem de bloqueador de anúncio). Sem
// POSTHOG_KEY nas variáveis do Convex, nada é enviado.
// PRIVACIDADE: nunca mande posição (lat/lng), nome, e-mail ou mensagens.
// Só o id da conta, números e categorias.

type Events = {
  match_created: { game_id: string };
  match_joined: { game_id: string; players_count: number };
  match_started: { game_id: string; round: number; players_count: number; hunters: number; role: 'hunter' | 'runner'; duration_min: number };
  match_finished: { game_id: string; round: number; players_count: number; duration_s: number; winner: 'hunter' | 'runner'; reason: string; role: 'hunter' | 'runner'; won: boolean };
  player_caught: { game_id: string; round: number; seconds_alive: number };
};

export type AnalyticsEvent = { [E in keyof Events]: { event: E; userId: Id<'users'>; props: Events[E] } }[keyof Events];

// Agenda o envio (mutations não podem chamar a internet).
export async function track(ctx: MutationCtx, events: AnalyticsEvent[]) {
  if (!events.length || !process.env.POSTHOG_KEY) return;
  const at = new Date().toISOString();
  await ctx.scheduler.runAfter(0, internal.analytics.capture, {
    events: events.map((e) => ({ event: e.event, distinctId: e.userId, props: e.props, at })),
  });
}

export const capture = internalAction({
  args: { events: v.array(v.object({ event: v.string(), distinctId: v.string(), props: v.any(), at: v.string() })) },
  handler: async (_ctx, { events }) => {
    const key = process.env.POSTHOG_KEY;
    if (!key) return;
    const host = process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com';
    const res = await fetch(`${host}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        batch: events.map((e) => ({ event: e.event, distinct_id: e.distinctId, timestamp: e.at, properties: { ...e.props, source: 'server' } })),
      }),
    });
    if (!res.ok) console.warn('posthog', res.status, (await res.text()).slice(0, 200));
  },
});
