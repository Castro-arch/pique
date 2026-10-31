// Push do site: registra o service worker (public/sw.js), inscreve este
// navegador e manda a inscrição para o servidor. Só roda com a permissão de
// avisos já dada; senão não faz nada. No celular (app) entra o webPush.ts.

const KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

type Save = (sub: { endpoint: string; p256dh: string; auth: string }) => Promise<unknown>;

function keyBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function enablePush(save: Save) {
  if (!KEY || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    await save({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
    return true;
  } catch {
    return false; // navegador sem push (ex.: iPhone fora da Tela de Início)
  }
}
