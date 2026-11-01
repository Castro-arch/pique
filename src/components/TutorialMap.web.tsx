import 'maplibre-gl/dist/maplibre-gl.css';

import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { StyleSheet, View } from 'react-native';

import { MapCredit } from '@/components/MapPins';
import { streetStyle, zoneShapes } from '@/lib/mapStyle';
import { TUTORIAL_CENTER, type LngLat } from '@/lib/tutorialRoutes';
import { colors } from '@/theme/tokens';

import type { TutorialMapProps } from './tutorialMapTypes';

// Mapa de ruas de verdade do Como jogar (site): a câmera voa e dá zoom a cada
// passo, a zona cresce e encolhe, e as pessoas correm pelas ruas seguindo
// caminhos do OpenStreetMap (src/lib/tutorialRoutes.ts).
maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');

const SPEED = 45; // metros do mapa por segundo de animação (bem acelerado)

export function TutorialMap({ camera, padding, zoneRadius, movers, marks, onFail, rate = 1 }: TutorialMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const zoneNow = useRef(0);

  useEffect(() => {
    if (!el.current) return;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: el.current,
        style: streetStyle(null, null) as unknown as maplibregl.StyleSpecification,
        center: [TUTORIAL_CENTER.lng, TUTORIAL_CENTER.lat],
        zoom: 13,
        attributionControl: false,
        interactive: false,
      });
    } catch {
      onFail?.();
      return;
    }
    m.on('load', () => setMap(m));
    return () => {
      setMap(null);
      m.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Câmera: voa até o enquadramento do passo (é o zoom entrando e saindo).
  useEffect(() => {
    if (!map) return;
    map.flyTo({ center: camera.center, zoom: camera.zoom, padding, duration: camera.instant ? 0 : 1600 / rate, essential: true });
  }, [map, camera.center[0], camera.center[1], camera.zoom, padding.top, padding.bottom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Zona: o raio anima do valor de agora até o do passo.
  useEffect(() => {
    if (!map) return;
    const from = zoneNow.current;
    const to = zoneRadius;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / (1100 / rate));
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const r = from + (to - from) * e;
      zoneNow.current = r;
      (map.getSource('zone') as maplibregl.GeoJSONSource | undefined)?.setData(zoneShapes(r > 1 ? { ...TUTORIAL_CENTER, radius: r } : null, null));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [map, zoneRadius]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <div ref={el} style={{ position: 'absolute', inset: 0, background: colors.inkSunken }} />
      {map
        ? movers.map((p) => (
            <Moving key={p.id} map={map} route={p.route} runKey={p.runKey} delay={(p.delay ?? 0) / rate} rate={rate} zIndex={p.zIndex ?? 1}>
              {p.node}
            </Moving>
          ))
        : null}
      {map
        ? marks.map((k) => (
            <Moving key={k.id} map={map} route={[k.at]} runKey={k.id} delay={0} rate={rate} zIndex={k.zIndex ?? 0}>
              {k.node}
            </Moving>
          ))
        : null}
      <MapCredit />
    </View>
  );
}

const meters = (a: LngLat, b: LngLat) => {
  const kx = 111_320 * Math.cos((a[1] * Math.PI) / 180);
  return Math.hypot((b[0] - a[0]) * kx, (b[1] - a[1]) * 111_320);
};

// Marcador que corre pela rota (de ponto em ponto, velocidade constante).
function Moving({ map, route, runKey, delay, rate, zIndex, children }: { map: maplibregl.Map; route: LngLat[]; runKey: string; delay: number; rate: number; zIndex: number; children: ReactNode }) {
  const [el] = useState(() => document.createElement('div'));
  const marker = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const m = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(route[0]).addTo(map);
    marker.current = m;
    return () => {
      m.remove();
    };
  }, [map, el]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = marker.current;
    if (!m) return;
    if (route.length < 2) {
      m.setLngLat(route[route.length - 1]);
      return;
    }
    const legs = route.slice(1).map((p, i) => meters(route[i], p));
    const total = legs.reduce((a, b) => a + b, 0);
    const dur = Math.min(5200, Math.max(700, (total / SPEED) * 1000)) / rate;
    m.setLngLat(route[0]);
    const start = performance.now() + delay;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.max(0, Math.min(1, (t - start) / dur));
      let d = k * total;
      let i = 0;
      while (i < legs.length - 1 && d > legs[i]) d -= legs[i++];
      const f = legs[i] ? d / legs[i] : 1;
      const a = route[i];
      const b = route[i + 1];
      m.setLngLat([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [runKey]); // eslint-disable-line react-hooks/exhaustive-deps

  el.style.zIndex = String(zIndex);
  return createPortal(children, el);
}

// Tempo (ms) que a pessoa leva para chegar ao fim da rota: para o boost sumir na hora certa.
export function routeMs(route: LngLat[]) {
  let total = 0;
  for (let i = 1; i < route.length; i++) total += meters(route[i - 1], route[i]);
  return route.length < 2 ? 0 : Math.min(5200, Math.max(700, (total / SPEED) * 1000));
}
