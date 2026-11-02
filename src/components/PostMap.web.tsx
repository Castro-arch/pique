import 'maplibre-gl/dist/maplibre-gl.css';

import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { streetStyle } from '@/lib/mapStyle';
import { colors } from '@/theme/tokens';

import type { PostMapProps } from './postMapTypes';

// Mapa do post da rodada (site): as ruas de verdade, a zona e o trajeto que o
// celular gravou (src/lib/trail.ts), enquadrado como nos apps de corrida.
// preserveDrawingBuffer deixa copiar o mapa para a imagem de compartilhar.
maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');

export function PostMap({ trail, zone, accent, onCanvas, padding = { top: 70, bottom: 190, left: 40, right: 40 } }: PostMapProps) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current) return;
    const line = trail.map(([lng, lat]) => [lng, lat] as [number, number]);
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: el.current,
        style: streetStyle(zone, null) as unknown as maplibregl.StyleSpecification,
        center: line[line.length - 1] ?? (zone ? [zone.lng, zone.lat] : [-46.6559, -23.5614]),
        zoom: 15,
        attributionControl: false,
        interactive: false,
        canvasContextAttributes: { preserveDrawingBuffer: true },
      });
    } catch {
      return;
    }
    m.on('load', () => {
      if (line.length > 1) {
        m.addSource('trail', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } } });
        // brilho embaixo + linha por cima, como no Strava
        m.addLayer({ id: 'trail-glow', type: 'line', source: 'trail', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': accent, 'line-width': 14, 'line-opacity': 0.25, 'line-blur': 4 } });
        m.addLayer({ id: 'trail-line', type: 'line', source: 'trail', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': accent, 'line-width': 5 } });
        m.addSource('ends', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              { type: 'Feature', properties: { end: 0 }, geometry: { type: 'Point', coordinates: line[0] } },
              { type: 'Feature', properties: { end: 1 }, geometry: { type: 'Point', coordinates: line[line.length - 1] } },
            ],
          },
        });
        m.addLayer({
          id: 'trail-ends',
          type: 'circle',
          source: 'ends',
          paint: {
            'circle-radius': ['case', ['==', ['get', 'end'], 1], 9, 6],
            'circle-color': ['case', ['==', ['get', 'end'], 1], accent, colors.paper],
            'circle-stroke-color': colors.ink,
            'circle-stroke-width': 3,
          },
        });
        const b = new maplibregl.LngLatBounds(line[0], line[0]);
        for (const p of line) b.extend(p);
        m.fitBounds(b, { padding, maxZoom: 17.2, duration: 0 });
      } else if (zone) {
        const dLat = zone.radius / 111_320;
        const dLng = dLat / Math.cos((zone.lat * Math.PI) / 180);
        m.fitBounds([[zone.lng - dLng, zone.lat - dLat], [zone.lng + dLng, zone.lat + dLat]], { padding, duration: 0 });
      }
      m.once('idle', () => onCanvas?.(m.getCanvas()));
    });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => m.resize()) : null;
    ro?.observe(el.current);
    return () => {
      ro?.disconnect();
      m.remove();
    };
  }, [trail.length, zone?.lat, zone?.lng, zone?.radius, accent]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <div ref={el} style={{ position: 'absolute', inset: 0, background: colors.inkSunken }} />
    </View>
  );
}
