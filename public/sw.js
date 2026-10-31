// Service worker do site do Pique: recebe os avisos da partida (Web Push)
// mesmo com o site fechado ou o celular bloqueado, e abre o jogo ao tocar.
// No iPhone só funciona com o site adicionado à Tela de Início.

// Vibração no ritmo do aviso: coração acelerado é tum-tum.
const VIBRATE = {
  heartbeat: [90, 130, 70, 500, 90, 130, 70],
  shout: [400, 150, 400, 150, 400],
  capture: [300, 120, 300],
};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const tag = data.tag || 'pique';
  event.waitUntil(
    self.registration.showNotification(data.title || 'Pique', {
      body: data.body || '',
      tag,
      renotify: true,
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: VIBRATE[tag] || [200, 100, 200],
      data: { url: '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) return open.focus();
      return self.clients.openWindow(event.notification.data?.url || '/');
    })(),
  );
});
