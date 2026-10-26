import type { StyleSpecification } from '@maplibre/maplibre-react-native';

import { colors } from '@/theme/tokens';

// Satélite da Esri (ArcGIS Location Platform), usado no site e no Android com
// o MapLibre. A conta grátis tem cota mensal e o uso pago fica desligado.
// Sem a chave (EXPO_PUBLIC_ESRI_KEY), os mapas voltam para o desenhado.
export const ESRI_KEY = process.env.EXPO_PUBLIC_ESRI_KEY;
export const ESRI_CREDIT = 'Powered by Esri · Maxar, Earthstar Geographics';

type Zone = { lat: number; lng: number; radius: number };

// Ponto a `m` metros do centro na direção `angle`.
function offset(c: { lat: number; lng: number }, m: number, angle: number): [number, number] {
  const lat = c.lat + (m * Math.sin(angle)) / 111_320;
  const lng = c.lng + (m * Math.cos(angle)) / (111_320 * Math.cos((c.lat * Math.PI) / 180));
  return [lng, lat];
}

function ring(c: Zone, radius: number) {
  const pts = Array.from({ length: 73 }, (_, i) => offset(c, radius, (i / 72) * 2 * Math.PI));
  return { type: 'Polygon' as const, coordinates: [pts] };
}

// A zona e, quando ela vai encolher, a zona nova. As cores vão nas
// propriedades para um par de camadas desenhar as duas.
export function zoneShapes(zone: Zone | null, nextRadius: number | null) {
  const features = [];
  if (zone) {
    features.push({
      type: 'Feature' as const,
      properties: {
        fill: nextRadius ? colors.amber : colors.lime,
        fillOpacity: nextRadius ? 0.16 : 0.06,
        line: nextRadius ? colors.paper : colors.lime,
        lineOpacity: nextRadius ? 0.55 : 0.85,
      },
      geometry: ring(zone, zone.radius),
    });
    if (nextRadius) {
      features.push({
        type: 'Feature' as const,
        properties: { fill: colors.lime, fillOpacity: 0.08, line: colors.lime, lineOpacity: 1 },
        geometry: ring(zone, nextRadius),
      });
    }
  }
  return { type: 'FeatureCollection' as const, features };
}

// Caixa que enquadra a zona inteira: [oeste, sul, leste, norte].
export function zoneBounds(zone: Zone): [number, number, number, number] {
  const [w] = offset(zone, zone.radius, Math.PI);
  const [e] = offset(zone, zone.radius, 0);
  const [, n] = offset(zone, zone.radius, Math.PI / 2);
  const [, s] = offset(zone, zone.radius, -Math.PI / 2);
  return [w, s, e, n];
}

// Folga para o placar em cima e o Radio embaixo, igual nas duas plataformas.
export const MAP_PADDING = { top: 250, bottom: 230, left: 16, right: 16 };

export function satelliteStyle(key: string, zone: Zone | null, nextRadius: number | null): StyleSpecification {
  return {
    version: 8,
    sources: {
      sat: {
        type: 'raster',
        tiles: [`https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${encodeURIComponent(key)}`],
        tileSize: 256,
        maxzoom: 19,
      },
      zone: { type: 'geojson', data: zoneShapes(zone, nextRadius) },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': colors.inkSunken } },
      { id: 'sat', type: 'raster', source: 'sat' },
      { id: 'zone-fill', type: 'fill', source: 'zone', paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': ['get', 'fillOpacity'] } },
      {
        id: 'zone-line',
        type: 'line',
        source: 'zone',
        paint: { 'line-color': ['get', 'line'], 'line-opacity': ['get', 'lineOpacity'], 'line-width': 2, 'line-dasharray': [4, 3] },
      },
    ],
  };
}
