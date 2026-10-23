// O que o mapa da partida precisa saber. Vem pronto da query play.view,
// que já aplicou a regra de quem pode ver quem.
export type MapPerson = {
  id: string;
  name: string;
  role: 'runner' | 'hunter';
  state: 'active' | 'caught' | 'left';
  isMe: boolean;
  kind: 'live' | 'ping';
  lat: number;
  lng: number;
  at: number;
  frame?: string | null;
};

export type MapZone = { lat: number; lng: number; radius: number };

export type MapBoost = { id: string; kind: 'despiste' | 'sombra' | 'escudo'; lat: number; lng: number };

export type GameMapProps = {
  zone: MapZone | null;
  nextZoneRadius: number | null;
  people: MapPerson[];
  now: number;
  hunter: boolean;
  outOfZone: boolean;
  dim?: number;
  boosts?: MapBoost[]; // só o corredor recebe
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
