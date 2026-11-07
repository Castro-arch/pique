import type { Beam } from '@/lib/mapStyle';

// O que o mapa da partida precisa saber. Vem pronto da query play.view,
// que já aplicou a regra de quem pode ver quem.
export type MapPerson = {
  id: string;
  name: string;
  role: 'runner' | 'hunter';
  state: 'active' | 'caught' | 'left';
  isMe: boolean;
  kind: 'live' | 'ping';
  heading?: number | null; // graus, 0 = norte (só ao vivo)
  lat: number;
  lng: number;
  at: number;
  frame?: string | null;
  faro?: boolean; // sob o Faro do caçador: brilha laranja
};

// Círculo, ou a zona desenhada (shape: os cantos, do tamanho shapeRadius).
export type MapZone = { lat: number; lng: number; radius: number; shape?: { lat: number; lng: number }[]; shapeRadius?: number };

export type MapBoost = { id: string; kind: 'despiste' | 'sombra' | 'escudo' | 'radar' | 'faro' | 'holofote'; lat: number; lng: number };

export type GameMapProps = {
  zone: MapZone | null;
  nextZoneRadius: number | null;
  people: MapPerson[];
  now: number;
  hunter: boolean;
  outOfZone: boolean;
  dim?: number;
  boosts?: MapBoost[]; // cada lado só recebe os boosts dele
  spot?: MapZone | null; // Holofote do caçador: círculo amarelo em volta dele
  beams?: Beam[]; // modo lanterna: os feixes do time do caçador
  draft?: { lat: number; lng: number }[] | null; // os cantos da zona que o anfitrião está desenhando
  onPress?: (at: { lat: number; lng: number }) => void; // toque no mapa (desenhar a zona)
  frame?: MapZone | null; // sem zona: a área que o mapa enquadra (enquanto desenha)
  padding?: { top: number; bottom: number; left: number; right: number }; // folga do enquadramento (mapas pequenos)
};

export const ago = (at: number, now: number) => {
  const s = Math.max(0, Math.round((now - at) / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function personTag(p: MapPerson, now: number) {
  if (p.isMe) return 'Você';
  if (p.kind === 'ping') return `${p.name} · ${ago(p.at, now)}`;
  if (p.state === 'caught') return `${p.name} · preso`;
  return `${p.name} · ao vivo`;
}

export function personState(p: MapPerson, outOfZone: boolean) {
  if (p.state === 'caught') return 'out' as const;
  if (p.isMe && outOfZone) return 'warning' as const;
  return p.role;
}
