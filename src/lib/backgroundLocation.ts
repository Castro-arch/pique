import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { convex } from './convex';

// Posição com a tela bloqueada (documento: expo-location + task-manager,
// serviço em primeiro plano no Android, Accuracy.High, só quando se mexe 5 m).
// A tarefa precisa ser definida no topo de um módulo carregado na abertura do
// app; por isso o _layout raiz importa este arquivo.

const TASK = 'pique-posicao';
let activeGame: Id<'games'> | null = null;

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (error || !activeGame || !convex || !data) return;
  const loc = data.locations[data.locations.length - 1];
  if (!loc) return;
  await convex
    .mutation(api.play.sendPosition, {
      gameId: activeGame,
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? 99,
      mocked: loc.mocked ?? false,
    })
    .catch(() => {});
});

// Liga o envio em segundo plano. Devolve false se a pessoa não liberou a
// localização "o tempo todo"; aí o jogo segue só com a tela aberta.
export async function startBackgroundTracking(gameId: string): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (!bg.granted) return false;
  activeGame = gameId as Id<'games'>;
  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.High,
    distanceInterval: 5,
    timeInterval: 3000,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Fitness,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Pique · partida em andamento',
      notificationBody: 'Sua posição vai para a partida só enquanto a rodada durar.',
      notificationColor: '#C8F23C',
      killServiceOnDestroy: true,
    },
  });
  return true;
}

// Desliga no fim da rodada, ao ser pego ou ao sair. Nada continua rodando.
export async function stopBackgroundTracking() {
  activeGame = null;
  if (await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TASK);
  }
}
