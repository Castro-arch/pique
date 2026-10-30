import { Camera, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { BoostPin } from '@/components/Boosts';
import { MapCredit, PersonPin } from '@/components/MapPins';
import { MAP_PADDING, streetStyle, zoneBounds } from '@/lib/mapStyle';

import type { GameMapProps } from './gameMapTypes';

// Mapa da partida no Android: ruas do OpenFreeMap desenhadas pelo MapLibre
// (sem Google, sem conta, sem cobrança). O iPhone usa o GameMap.native.tsx
// (Apple Maps) e o site, o GameMap.tsx.
export function GameMap({ zone, nextZoneRadius, people, now, hunter, outOfZone, dim = 0, boosts = [] }: GameMapProps) {
  const camera = useRef<CameraRef>(null);
  // O estilo leva a zona; muda só quando a zona muda.
  const style = useMemo(
    () => streetStyle(zone, nextZoneRadius),
    [zone?.lat, zone?.lng, zone?.radius, nextZoneRadius], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Enquadra a zona inteira, com folga para o placar em cima e o Radio embaixo.
  useEffect(() => {
    if (zone) camera.current?.fitBounds(zoneBounds(zone), { padding: MAP_PADDING, duration: 400 });
  }, [zone?.lat, zone?.lng, zone?.radius]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={StyleSheet.absoluteFill}>
      <Map style={StyleSheet.absoluteFill} mapStyle={style} attribution={false} logo={false} compass={false} scaleBar={false} touchRotate={false} touchPitch={false}>
        <Camera ref={camera} initialViewState={zone ? { bounds: zoneBounds(zone), padding: MAP_PADDING } : { center: [-46.63, -23.55], zoom: 15 }} />
        {boosts.map((b) => (
          <Marker key={b.id} id={`boost-${b.id}`} lngLat={[b.lng, b.lat]} anchor="center">
            <View style={{ width: 110 }}>
              <BoostPin kind={b.kind} />
            </View>
          </Marker>
        ))}
        {people.map((p) => (
          <Marker key={p.id} id={`p-${p.id}`} lngLat={[p.lng, p.lat]} anchor="left" offset={[-(p.isMe ? 23 : 18), 0]}>
            <PersonPin p={p} now={now} hunter={hunter} outOfZone={outOfZone} />
          </Marker>
        ))}
      </Map>
      {/* Degradês leves em cima e embaixo, como no design, para o placar e o Radio lerem bem. */}
      <LinearGradient pointerEvents="none" colors={['rgba(11,14,17,0.55)', 'rgba(11,14,17,0)']} style={[styles.fade, { top: 0, height: 240 }]} />
      <LinearGradient pointerEvents="none" colors={['rgba(11,14,17,0)', 'rgba(11,14,17,0.6)']} style={[styles.fade, { bottom: 0, height: 320 }]} />
      {dim > 0 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(11,14,17,${dim})` }]} /> : null}
      <MapCredit />
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0 },
});
