import type { TrailPoint } from '@/lib/trail';

export type PostMapProps = {
  trail: TrailPoint[];
  zone: { lat: number; lng: number; radius: number } | null;
  accent: string;
  // o canvas do mapa já desenhado, para copiar na imagem de compartilhar (só no site)
  onCanvas?: (canvas: HTMLCanvasElement) => void;
  padding?: { top: number; bottom: number; left: number; right: number };
};
