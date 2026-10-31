// No app (celular) não há Web Push: os avisos chegam pela conexão com o
// servidor e viram notificações locais (lib/gameAlerts). Ver webPush.web.ts.
type Save = (sub: { endpoint: string; p256dh: string; auth: string }) => Promise<unknown>;

export async function enablePush(_save: Save) {
  return false;
}
