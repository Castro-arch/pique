'use node';

import { v } from 'convex/values';
import webpush from 'web-push';

import { internal } from './_generated/api';
import { internalAction } from './_generated/server';

// Envia o push do site (Web Push) para os navegadores inscritos. As chaves
// VAPID ficam nas variáveis do Convex (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT); sem elas, não envia nada e o jogo segue igual.
export const send = internalAction({
  args: { userIds: v.array(v.id('users')), title: v.string(), body: v.string(), tag: v.string() },
  handler: async (ctx, { userIds, title, body, tag }) => {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
    webpush.setVapidDetails(VAPID_SUBJECT ?? 'https://pique.expo.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const subs = await ctx.runQuery(internal.alerts.subscriptionsFor, { userIds });
    const payload = JSON.stringify({ title, body, tag });
    await Promise.all(
      subs.map(async (s) => {
        try {
          // Aviso de partida vale pouco depois de 2 min: o navegador pode descartar.
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 120, urgency: 'high' });
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await ctx.runMutation(internal.alerts.dropSubscription, { endpoint: s.endpoint });
        }
      }),
    );
  },
});
