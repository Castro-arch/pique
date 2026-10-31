// No site os avisos chegam como push pelo service worker (public/sw.js),
// mesmo com a aba fechada. Ver gameAlerts.ts para o app.
export function useGameAlerts(_gameId: string | undefined) {}
