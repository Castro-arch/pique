// No site os avisos chegam pelo service worker (public/sw.js); nada a preparar aqui.
export const CHANNEL = { game: 'partida', heartbeat: 'coracao' } as const;

export async function setupNotificationChannels() {}
