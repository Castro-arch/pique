import type { StyleSpecification } from '@maplibre/maplibre-react-native';

import { colors } from '@/theme/tokens';

// Mapa de ruas da partida (site e Android), desenhado pelo MapLibre com os
// dados do OpenFreeMap: grátis, sem conta e sem chave. Os dados são do
// OpenStreetMap no padrão OpenMapTiles; o estilo abaixo é o do Pique (escuro,
// ruas em cinza, parques em verde-escuro). Se o serviço sair do ar, o mapa
// fica só no fundo escuro e a partida segue normal.
export const MAP_CREDIT = 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap';

type Pt = { lat: number; lng: number };
type Zone = Pt & { radius: number; shape?: Pt[]; shapeRadius?: number };
// Feixe da lanterna: de onde sai, para onde aponta (graus, 0 = norte), alcance e abertura para cada lado.
export type Beam = Pt & { heading: number; m: number; deg: number };

// Ponto a `m` metros do centro na direção `angle`.
function offset(c: { lat: number; lng: number }, m: number, angle: number): [number, number] {
  const lat = c.lat + (m * Math.sin(angle)) / 111_320;
  const lng = c.lng + (m * Math.cos(angle)) / (111_320 * Math.cos((c.lat * Math.PI) / 180));
  return [lng, lat];
}

// O contorno da zona com o raio `radius`: o círculo, ou os cantos do desenho
// aproximados do centro na proporção do raio (a zona desenhada encolhe assim).
export function zoneOutline(c: Zone, radius: number): [number, number][] {
  if (c.shape?.length) {
    const f = radius / (c.shapeRadius ?? c.radius);
    const pts = c.shape.map((p) => [c.lng + (p.lng - c.lng) * f, c.lat + (p.lat - c.lat) * f] as [number, number]);
    return [...pts, pts[0]];
  }
  return Array.from({ length: 73 }, (_, i) => offset(c, radius, (i / 72) * 2 * Math.PI));
}

function ring(c: Zone, radius: number) {
  return { type: 'Polygon' as const, coordinates: [zoneOutline(c, radius)] };
}

// O cone do feixe. offset() conta o ângulo a partir do leste, anti-horário; a bússola, do norte, horário.
export function beamOutline(b: Beam): [number, number][] {
  const toAngle = (deg: number) => ((90 - deg) * Math.PI) / 180;
  const arc = Array.from({ length: 13 }, (_, i) => offset(b, b.m, toAngle(b.heading - b.deg + (i / 12) * 2 * b.deg)));
  const tip: [number, number] = [b.lng, b.lat];
  return [tip, ...arc, tip];
}

// A zona e, quando ela vai encolher, a zona nova. As cores vão nas
// propriedades para um par de camadas desenhar as duas.
// spot: o círculo do Holofote do caçador, em amarelo.
// beams: os feixes das lanternas do time (modo lanterna).
// draft: os cantos da zona que o anfitrião está desenhando.
export function zoneShapes(zone: Zone | null, nextRadius: number | null, spot?: Zone | null, beams: Beam[] = [], draft: Pt[] | null = null) {
  const features = [];
  for (const b of beams) {
    features.push({
      type: 'Feature' as const,
      properties: { fill: BEAM, fillOpacity: 0.28, line: BEAM, lineOpacity: 0.7 },
      geometry: { type: 'Polygon' as const, coordinates: [beamOutline(b)] },
    });
  }
  if (draft?.length) {
    const pts = draft.map((p) => [p.lng, p.lat] as [number, number]);
    features.push({
      type: 'Feature' as const,
      properties: { fill: colors.lime, fillOpacity: 0.1, line: colors.lime, lineOpacity: 1 },
      geometry: pts.length >= 3 ? { type: 'Polygon' as const, coordinates: [[...pts, pts[0]]] } : { type: 'LineString' as const, coordinates: pts },
    });
    for (const c of pts) {
      features.push({ type: 'Feature' as const, properties: { corner: 1, fill: colors.lime, fillOpacity: 1, line: colors.lime, lineOpacity: 1 }, geometry: { type: 'Point' as const, coordinates: c } });
    }
  }
  if (spot) {
    features.push({
      type: 'Feature' as const,
      properties: { fill: SPOT, fillOpacity: 0.18, line: SPOT, lineOpacity: 0.95 },
      geometry: ring(spot, spot.radius),
    });
  }
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
  if (zone.shape?.length) {
    const pts = zoneOutline(zone, zone.radius);
    return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
  }
  const [w] = offset(zone, zone.radius, Math.PI);
  const [e] = offset(zone, zone.radius, 0);
  const [, n] = offset(zone, zone.radius, Math.PI / 2);
  const [, s] = offset(zone, zone.radius, -Math.PI / 2);
  return [w, s, e, n];
}

// Folga para o placar em cima e o Radio embaixo, igual nas duas plataformas.
export const MAP_PADDING = { top: 250, bottom: 230, left: 16, right: 16 };

// Cores do mapa de ruas (tela 12.1).
const M = {
  ground: '#12171C',
  block: '#151B21',
  green: '#14261B',
  water: '#102530',
  river: '#17384A',
  building: '#1D252D',
  buildingLine: '#262F38',
  minor: '#2B3540',
  major: '#36424E',
  motorway: '#43505D',
  path: '#2A333C',
  label: '#8A939B',
  labelPark: '#4E7A5C',
  labelPlace: '#6B747C',
};

const name = ['coalesce', ['get', 'name:pt'], ['get', 'name']];
const width = (z14: number, z18: number) => ['interpolate', ['exponential', 1.6], ['zoom'], 12, z14 * 0.3, 14, z14, 18, z18];
const road = (id: string, classes: string[], color: string, w: [number, number], extra: object = {}) => ({
  id,
  type: 'line',
  source: 'omt',
  'source-layer': 'transportation',
  filter: ['match', ['get', 'class'], classes, true, false],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': color, 'line-width': width(...w), ...extra },
});
const label = (id: string, sourceLayer: string, color: string, size: unknown, extra: object = {}) => ({
  id,
  type: 'symbol',
  source: 'omt',
  'source-layer': sourceLayer,
  minzoom: 14,
  layout: { 'text-field': name, 'text-font': ['Noto Sans Bold'], 'text-size': size, 'text-transform': 'uppercase', 'text-letter-spacing': 0.06, ...extra },
  paint: { 'text-color': color, 'text-halo-color': M.ground, 'text-halo-width': 1.2 },
});

export const SPOT = '#FFE14A';
export const BEAM = colors.pink; // o feixe é da cor do caçador

export function streetStyle(zone: Zone | null, nextRadius: number | null, spot?: Zone | null, beams: Beam[] = [], draft: Pt[] | null = null): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      zone: { type: 'geojson', data: zoneShapes(zone, nextRadius, spot, beams, draft) },
    },
    layers: [
      { id: 'ground', type: 'background', paint: { 'background-color': M.ground } },
      {
        id: 'blocks',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landuse',
        filter: ['match', ['get', 'class'], ['residential', 'commercial', 'retail'], true, false],
        paint: { 'fill-color': M.block },
      },
      { id: 'green', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['match', ['get', 'class'], ['grass', 'wood', 'farmland'], true, false], paint: { 'fill-color': M.green } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': M.green } },
      { id: 'pitch', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: ['match', ['get', 'class'], ['pitch', 'playground', 'cemetery'], true, false], paint: { 'fill-color': M.green } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': M.water } },
      { id: 'river', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-color': M.river, 'line-width': width(2, 6) } },
      { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': M.building, 'fill-outline-color': M.buildingLine } },
      road('path', ['path', 'track'], M.path, [1, 2.5], { 'line-dasharray': [2, 2] }),
      road('minor', ['minor', 'service'], M.minor, [3, 12]),
      road('major', ['secondary', 'tertiary'], M.major, [4, 16]),
      road('primary', ['primary', 'trunk', 'motorway'], M.motorway, [5, 20]),
      road('rail', ['rail', 'transit'], M.path, [1, 2], { 'line-dasharray': [3, 3] }),
      label('street-names', 'transportation_name', M.label, ['interpolate', ['linear'], ['zoom'], 14, 9, 18, 12], { 'symbol-placement': 'line' }),
      label('park-names', 'park', M.labelPark, 10),
      { ...label('places', 'place', M.labelPlace, 11, { 'text-letter-spacing': 0.1 }), minzoom: 12, filter: ['match', ['get', 'class'], ['suburb', 'neighbourhood', 'quarter'], true, false] },
      { id: 'zone-fill', type: 'fill', source: 'zone', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': ['get', 'fillOpacity'] } },
      {
        id: 'zone-line',
        type: 'line',
        source: 'zone',
        filter: ['!=', ['geometry-type'], 'Point'],
        paint: { 'line-color': ['get', 'line'], 'line-opacity': ['get', 'lineOpacity'], 'line-width': 2, 'line-dasharray': [4, 3] },
      },
      // os cantos da zona sendo desenhada
      {
        id: 'zone-corners',
        type: 'circle',
        source: 'zone',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-radius': 7, 'circle-color': colors.lime, 'circle-stroke-color': colors.ink, 'circle-stroke-width': 2 },
      },
    ],
  } as StyleSpecification;
}
