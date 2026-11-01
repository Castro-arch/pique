import type { ClientEvents } from './analytics.web';

// No app nativo ainda não há analytics de tela (os eventos de partida saem do
// servidor, então já contam). Mesma interface do analytics.web.ts.
export type { ClientEvents };
export function track<E extends keyof ClientEvents>(_event: E, _props: ClientEvents[E]) {}
export function identify(_userId: string) {}
export function resetAnalytics() {}
