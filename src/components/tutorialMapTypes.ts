import type { ReactNode } from 'react';

import type { LngLat } from '@/lib/tutorialRoutes';

// O que o mapa do Como jogar precisa saber em cada passo.
export type TutorialMover = { id: string; route: LngLat[]; runKey: string; node: ReactNode; delay?: number; zIndex?: number };
export type TutorialMark = { id: string; at: LngLat; node: ReactNode; zIndex?: number };

export type TutorialMapProps = {
  camera: { center: LngLat; zoom: number; instant?: boolean };
  padding: { top: number; bottom: number; left: number; right: number };
  zoneRadius: number; // metros; 0 = sem zona
  movers: TutorialMover[];
  marks: TutorialMark[];
  rate?: number; // velocidade do tutorial (1, 1.5, 2)
  onFail?: () => void;
};
