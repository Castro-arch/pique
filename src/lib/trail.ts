import { Platform } from 'react-native';

// O trajeto da rodada, como nos apps de corrida, mas que NUNCA sai do celular:
// o servidor só guarda a última posição (convex/schema.ts, positions). Cada
// posição que o jogo manda também entra aqui, e a tela de post desenha o
// caminho no mapa. No site fica no localStorage; no app, por enquanto, só na
// memória enquanto ele está aberto. Trajetos com mais de 3 dias são apagados.

export type TrailPoint = [lng: number, lat: number, at: number];

const PREFIX = 'pique.trajeto.';
const MAX_POINTS = 2500;
const MAX_AGE = 3 * 24 * 60 * 60 * 1000;
const MIN_STEP_M = 4;
const memory = new Map<string, TrailPoint[]>();

const keyOf = (gameId: string, startedAt: number) => `${PREFIX}${gameId}.${startedAt}`;
const web = () => Platform.OS === 'web' && typeof localStorage !== 'undefined';

function load(key: string): TrailPoint[] {
  if (memory.has(key)) return memory.get(key)!;
  let pts: TrailPoint[] = [];
  if (web()) {
    try {
      pts = JSON.parse(localStorage.getItem(key) ?? '[]');
    } catch {}
  }
  memory.set(key, pts);
  return pts;
}

function meters(a: TrailPoint, b: TrailPoint) {
  const k = Math.PI / 180;
  const x = (b[0] - a[0]) * k * Math.cos(((a[1] + b[1]) / 2) * k);
  const y = (b[1] - a[1]) * k;
  return Math.sqrt(x * x + y * y) * 6371000;
}

export function recordTrail(gameId: string, startedAt: number, lat: number, lng: number, accuracy: number) {
  if (accuracy > 60) return; // ponto ruim (GPS sem sinal) faz o desenho pular
  const key = keyOf(gameId, startedAt);
  const pts = load(key);
  const p: TrailPoint = [Number(lng.toFixed(6)), Number(lat.toFixed(6)), Date.now()];
  const last = pts[pts.length - 1];
  if (last && meters(last, p) < MIN_STEP_M) return;
  pts.push(p);
  if (pts.length > MAX_POINTS) pts.splice(0, pts.length - MAX_POINTS);
  if (web()) {
    try {
      localStorage.setItem(key, JSON.stringify(pts));
    } catch {}
  }
}

export function readTrail(gameId: string, startedAt: number | null | undefined): TrailPoint[] {
  if (!startedAt) return [];
  return load(keyOf(gameId, startedAt));
}

// Apaga trajetos velhos (chamado ao abrir o jogo).
export function pruneTrails() {
  if (!web()) return;
  try {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIX)) continue;
      const startedAt = Number(k.split('.').pop());
      if (!startedAt || now - startedAt > MAX_AGE) localStorage.removeItem(k);
    }
  } catch {}
}

// O trajeto como caminho SVG, cabendo num retângulo (também usado no adesivo).
export function trailPath(trail: TrailPoint[], w: number, h: number, pad: number) {
  if (trail.length < 2) return null;
  const k = Math.cos((trail[0][1] * Math.PI) / 180);
  const xs = trail.map((p) => p[0] * k);
  const ys = trail.map((p) => -p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min((w - 2 * pad) / (x1 - x0 || 1e-9), (h - 2 * pad) / (y1 - y0 || 1e-9));
  const ox = (w - (x1 - x0) * s) / 2;
  const oy = (h - (y1 - y0) * s) / 2;
  const pts = xs.map((x, i) => [ox + (x - x0) * s, oy + (ys[i] - y0) * s] as [number, number]);
  return { path: 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L'), start: pts[0], end: pts[pts.length - 1] };
}

// Ao sair ou excluir a conta: apaga todos os trajetos deste aparelho.
export function clearTrails() {
  memory.clear();
  if (!web()) return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {}
}
