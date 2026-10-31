import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalAction, internalMutation } from './_generated/server';
import { distanceM } from './lib';

// Boosts só nas ruas: quando o anfitrião marca a zona, buscamos as ruas e
// calçadas da área no OpenStreetMap (Overpass) e guardamos pontos em cima
// delas. Os boosts nascem nesses pontos, nunca dentro de quarteirão ou casa.

const OVERPASS = 'https://overpass-api.de/api/interpreter';
// Ruas e caminhos onde dá para andar (sem rodovia nem trilho).
const WALKABLE = '^(residential|living_street|unclassified|tertiary|secondary|primary|pedestrian|footway|path|service|cycleway|steps|track)$';
const EVERY_M = 18; // um ponto a cada 18 m de rua
const MAX_POINTS = 400;

export const zoneKey = (z: { lat: number; lng: number; radius: number }) => `${z.lat.toFixed(5)},${z.lng.toFixed(5)},${Math.round(z.radius)}`;

type Pt = { lat: number; lng: number };

// Pontos a cada EVERY_M metros ao longo das ruas, só os que ficam na zona.
export function samplePoints(ways: Pt[][], zone: { lat: number; lng: number; radius: number }) {
  const out: Pt[] = [];
  for (const way of ways) {
    for (let i = 0; i + 1 < way.length; i++) {
      const a = way[i];
      const b = way[i + 1];
      const len = distanceM(a, b);
      const n = Math.max(1, Math.floor(len / EVERY_M));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const p = { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
        if (distanceM(p, zone) <= zone.radius * 0.92) out.push(p);
      }
    }
  }
  // Embaralha e corta: espalha pela zona inteira sem guardar demais.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, MAX_POINTS).map((p) => ({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }));
}

export const load = internalAction({
  args: { gameId: v.id('games'), lat: v.number(), lng: v.number(), radius: v.number() },
  handler: async (ctx, zone) => {
    const query = `[out:json][timeout:25];way["highway"~"${WALKABLE}"](around:${Math.round(zone.radius)},${zone.lat},${zone.lng});(._;>;);out skel;`;
    let data: { elements: { type: string; id: number; lat?: number; lon?: number; nodes?: number[] }[] };
    try {
      const res = await fetch(OVERPASS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Pique (pique.expo.app)' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) return; // sem ruas: os boosts caem em qualquer lugar da zona, como antes
      data = await res.json();
    } catch {
      return;
    }
    const nodes = new Map<number, Pt>();
    for (const e of data.elements) if (e.type === 'node' && e.lat !== undefined && e.lon !== undefined) nodes.set(e.id, { lat: e.lat, lng: e.lon });
    const ways = data.elements
      .filter((e) => e.type === 'way' && e.nodes)
      .map((e) => e.nodes!.map((id) => nodes.get(id)).filter((p): p is Pt => !!p));
    const points = samplePoints(ways, zone);
    await ctx.runMutation(internal.streets.save, { gameId: zone.gameId, key: zoneKey(zone), points });
  },
});

export const save = internalMutation({
  args: { gameId: v.id('games'), key: v.string(), points: v.array(v.object({ lat: v.number(), lng: v.number() })) },
  handler: async (ctx, { gameId, key, points }) => {
    const game = await ctx.db.get(gameId);
    // A zona mudou enquanto buscava: a busca nova vai salvar a dela.
    if (!game?.zone || zoneKey(game.zone) !== key) return;
    await ctx.db.patch(gameId, { streets: { key, points } });
  },
});
