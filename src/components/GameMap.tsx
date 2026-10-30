import { useState } from 'react';

import { DrawnMap } from '@/components/GameMapDrawn';
import { StreetMap } from '@/components/GameMapStreets';

import type { GameMapProps } from './gameMapTypes';

// Mapa da partida no navegador (quem joga pelo iPhone usa o site): mapa de
// ruas do OpenFreeMap com o MapLibre. Se o navegador não tiver WebGL, o desenhado.
// No Android entra o GameMap.android.tsx; no iPhone, o GameMap.native.tsx.
export function GameMap(props: GameMapProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <DrawnMap {...props} />;
  return <StreetMap {...props} onFail={() => setFailed(true)} />;
}
