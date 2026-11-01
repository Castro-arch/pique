import { MapBackdrop } from '@/components/MapBackdrop';
import type { LngLat } from '@/lib/tutorialRoutes';

import type { TutorialMapProps } from './tutorialMapTypes';

// Fora do site (app nativo, ainda não lançado) o Como jogar usa o mapa
// desenhado, sem as pessoas correndo. O site usa TutorialMap.web.tsx.
export function TutorialMap(_: TutorialMapProps) {
  return <MapBackdrop fades={false} />;
}

export function routeMs(route: LngLat[]) {
  return route.length < 2 ? 0 : 2000;
}
