import { useState } from 'react';

import { DrawnMap } from '@/components/GameMapDrawn';
import { SatelliteMap } from '@/components/GameMapSatellite';
import { ESRI_KEY } from '@/lib/satellite';

import type { GameMapProps } from './gameMapTypes';

// Mapa da partida no navegador (quem joga pelo iPhone usa o site): satélite
// da Esri com o MapLibre. Sem a chave, ou se o mapa não carregar, o desenhado.
// No Android entra o GameMap.android.tsx; no iPhone, o GameMap.native.tsx.
export function GameMap(props: GameMapProps) {
  const [failed, setFailed] = useState(false);
  if (ESRI_KEY && !failed) return <SatelliteMap {...props} esriKey={ESRI_KEY} onFail={() => setFailed(true)} />;
  return <DrawnMap {...props} />;
}
