import { useQuery } from 'convex/react';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { CHANNEL } from './notifications';

// Avisos da partida no app. Durante a rodada o serviço de localização mantém o
// app vivo no bolso, e a conexão com o servidor continua aberta: quando chega
// um aviso novo e o app não está na frente, vira notificação do celular. Com o
// app aberto, a própria tela já mostra tudo. No site, quem faz isso é o push.
export function useGameAlerts(gameId: string | undefined) {
  const alerts = useQuery(api.alerts.mine, gameId ? { gameId: gameId as Id<'games'> } : 'skip');
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!alerts) return;
    // Na primeira leitura só anota o que já existia: não repete aviso velho.
    if (!seen.current) {
      seen.current = new Set(alerts.map((a) => a.id));
      return;
    }
    const fresh = alerts.filter((a) => !seen.current!.has(a.id)).reverse();
    fresh.forEach((a) => seen.current!.add(a.id));
    if (AppState.currentState === 'active') return;
    for (const a of fresh) {
      Notifications.scheduleNotificationAsync({
        content: { title: a.title, body: a.body, sound: true, data: { gameId, kind: a.kind } },
        trigger: { channelId: a.kind === 'heartbeat' ? CHANNEL.heartbeat : CHANNEL.game },
      }).catch(() => {});
    }
  }, [alerts, gameId]);
}
