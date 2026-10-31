import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Notificações locais do app (avisos da partida com o celular no bolso).
// Canais do Android: o coração acelerado tem o próprio, com a vibração
// tum-tum; o resto vai no canal da partida. Rodado uma vez na abertura.

export const CHANNEL = { game: 'partida', heartbeat: 'coracao' } as const;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL.game, {
    name: 'Partida',
    description: 'Ping, grito, pega e fim da rodada',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 150, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync(CHANNEL.heartbeat, {
    name: 'Coração acelerado',
    description: 'Um caçador chegou a menos de 30 m',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 90, 130, 70, 500, 90, 130, 70, 500, 90, 130, 70],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}
