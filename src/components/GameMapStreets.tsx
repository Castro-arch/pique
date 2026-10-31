import 'maplibre-gl/dist/maplibre-gl.css';

import { LinearGradient } from 'expo-linear-gradient';
import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { StyleSheet, View } from 'react-native';

import { BoostPin } from '@/components/Boosts';
import { MapCredit, PersonPin, pinSize } from '@/components/MapPins';
import { MAP_PADDING, streetStyle, zoneBounds, zoneShapes } from '@/lib/mapStyle';
import { colors } from '@/theme/tokens';

import type { GameMapProps } from './gameMapTypes';

// Mapa de ruas no navegador (OpenFreeMap desenhado pelo MapLibre), com a zona
// tracejada e os jogadores e boosts como marcadores. Os marcadores
// usam os mesmos componentes do app, renderizados dentro do mapa via portal.
// O worker do MapLibre vem de public/ (veja scripts/copy-maplibre-worker.js).
maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');

export function StreetMap({
  onFail,
  zone,
  nextZoneRadius,
  people,
  now,
  hunter,
  outOfZone,
  dim = 0,
  boosts = [],
  padding = MAP_PADDING,
}: GameMapProps & { onFail: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!el.current) return;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: el.current,
        // Mesmo formato de estilo; só os tipos vêm de pacotes diferentes (nativo e web).
        style: streetStyle(zone, nextZoneRadius) as unknown as maplibregl.StyleSpecification,
        center: zone ? [zone.lng, zone.lat] : [-46.63, -23.55],
        zoom: 16,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
    } catch {
      onFail(); // navegador sem WebGL
      return;
    }
    m.touchZoomRotate.disableRotation();
    m.on('load', () => setMap(m));
    if (__DEV__) m.on('error', (e) => console.warn('mapa:', e.error?.message ?? e));
    return () => {
      setMap(null);
      m.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Zona nova ou encolhendo: troca o desenho e reenquadra.
  useEffect(() => {
    if (!map) return;
    (map.getSource('zone') as maplibregl.GeoJSONSource | undefined)?.setData(zoneShapes(zone, nextZoneRadius));
  }, [map, zone?.lat, zone?.lng, zone?.radius, nextZoneRadius]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (map && zone) map.fitBounds(zoneBounds(zone), { padding, duration: 0 });
  }, [map, zone?.lat, zone?.lng, zone?.radius]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={StyleSheet.absoluteFill}>
      <div ref={el} style={{ position: 'absolute', inset: 0, background: colors.inkSunken }} />
      {map
        ? boosts.map((b) => (
            <Marker key={b.id} map={map} lat={b.lat} lng={b.lng} anchor="top" offset={[0, -23]} zIndex={0}>
              <View style={{ width: 110 }}>
                <BoostPin kind={b.kind} />
              </View>
            </Marker>
          ))
        : null}
      {map
        ? people.map((p) => (
            <Marker key={p.id} map={map} lat={p.lat} lng={p.lng} anchor="left" offset={[-pinSize(p.isMe) / 2, 0]} zIndex={p.isMe ? 10 : 1}>
              <PersonPin p={p} now={now} hunter={hunter} outOfZone={outOfZone} />
            </Marker>
          ))
        : null}
      {/* Degradês leves em cima e embaixo, como no celular, para o placar e o Radio lerem bem. */}
      <LinearGradient pointerEvents="none" colors={['rgba(11,14,17,0.55)', 'rgba(11,14,17,0)']} style={[styles.fade, { top: 0, height: 240 }]} />
      <LinearGradient pointerEvents="none" colors={['rgba(11,14,17,0)', 'rgba(11,14,17,0.6)']} style={[styles.fade, { bottom: 0, height: 320 }]} />
      {dim > 0 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(11,14,17,${dim})` }]} /> : null}
      <MapCredit />
    </View>
  );
}

function Marker({
  map,
  lat,
  lng,
  anchor,
  offset = [0, 0],
  zIndex = 1,
  children,
}: {
  map: maplibregl.Map;
  lat: number;
  lng: number;
  anchor: maplibregl.PositionAnchor;
  offset?: [number, number];
  zIndex?: number;
  children: ReactNode;
}) {
  const [el] = useState(() => document.createElement('div'));
  const marker = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const m = new maplibregl.Marker({ element: el, anchor, offset }).setLngLat([lng, lat]).addTo(map);
    marker.current = m;
    return () => {
      m.remove();
    };
  }, [map, el]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    marker.current?.setLngLat([lng, lat]);
  }, [lat, lng]);

  el.style.zIndex = String(zIndex);
  return createPortal(children, el);
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0 },
});
