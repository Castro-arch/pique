import posthog from 'posthog-js';

// Analytics do site (PostHog). Os eventos de partida saem do servidor
// (convex/analytics.ts); aqui ficam só os de tela: qual tela abriu, tutorial,
// convite compartilhado. Sem EXPO_PUBLIC_POSTHOG_KEY, ou em desenvolvimento,
// nada é enviado.
// PRIVACIDADE: nada de posição, nome, @, código de partida ou texto da tela.
// Por isso o autocapture (cliques com o texto do botão) e a gravação de sessão
// ficam desligados, e a tela vai só pelo nome do arquivo (ex.: "convite/[codigo]").
const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
let on = false;

function start() {
  if (on || !KEY || __DEV__ || typeof window === 'undefined') return on;
  posthog.init(KEY, {
    api_host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    person_profiles: 'identified_only',
    persistence: 'localStorage',
    // sem código extra baixado do PostHog e sem feature flags (não usamos)
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    // o PostHog manda o endereço da página junto; nele pode ter código de
    // partida (/convite/ABC123) ou @ (/u/fulano). Sai tudo antes de enviar.
    before_send: (event) => {
      if (!event) return event;
      for (const bag of [event.properties, event.$set, event.$set_once]) {
        if (!bag) continue;
        for (const k of Object.keys(bag)) if (/url|pathname|referr|search/i.test(k)) delete bag[k];
      }
      return event;
    },
  });
  on = true;
  return on;
}

export type ClientEvents = {
  screen_viewed: { screen: string };
  tutorial_intro: { action: 'start' | 'skip' };
  tutorial_closed: { step: number; of: number; completed: boolean };
  invite_shared: { from: 'lobby' | 'qr' | 'crew' | 'post' };
  recovery_code_created: { replaced: boolean };
};

export function track<E extends keyof ClientEvents>(event: E, props: ClientEvents[E]) {
  if (start()) posthog.capture(event, props);
}

// Liga os eventos do site à mesma conta dos eventos do servidor (id do Convex).
export function identify(userId: string) {
  if (start()) posthog.identify(userId);
}

export function resetAnalytics() {
  if (on) posthog.reset();
}
