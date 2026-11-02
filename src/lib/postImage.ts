import { Platform } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

import { trailPath, type TrailPoint } from './trail';

// A imagem do post (só no site): desenha num canvas o mesmo que a prévia
// mostra e devolve um PNG para compartilhar ou salvar.
// - mapa: 1080x1350 (formato do feed/story), com o mapa copiado do PostMap;
// - selfie: 1080x1350 com a foto escolhida no fundo;
// - adesivo: 1080x1080 com fundo transparente, para colar em cima de outra foto.

export type PostData = {
  kicker: string; // "ESCAPEI DE 2 CAÇADORES"
  big: string; // "30:00" ou "3"
  bigUnit: string; // "escondido" ou "pegos"
  tagline: string; // "ninguém me achou"
  stats: [string, string][]; // [rótulo, valor]
  accent: string;
  trail: TrailPoint[];
};

const W = 1080;

// A linha de números do adesivo, com unidade: "1,9 km · 11'34"/km · 9 pings".
export const stickerLine = (d: PostData) =>
  d.stats.map(([l, v]) => (l === 'Ritmo' && v !== '–' ? `${v}/km` : l === 'Pings livres' ? `${v} ${v === '1' ? 'ping' : 'pings'}` : v)).join(' · ');

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = src;
  });
}

function cover(ctx: CanvasRenderingContext2D, src: CanvasImageSource & { width: number; height: number }, w: number, h: number) {
  const s = Math.max(w / src.width, h / src.height);
  const dw = src.width * s;
  const dh = src.height * s;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function brand(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, align: 'left' | 'center' = 'left', outline = false) {
  ctx.font = `${size}px ${fonts.display}`;
  const tw = ctx.measureText('pique').width;
  const dot = size * 0.32;
  const total = dot * 2 + size * 0.3 + tw;
  const x0 = align === 'center' ? x - total / 2 : x;
  ctx.fillStyle = colors.lime;
  ctx.beginPath();
  ctx.arc(x0 + dot, y - size * 0.32, dot, 0, Math.PI * 2);
  if (outline) {
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(11,14,17,0.75)';
    ctx.stroke();
  }
  ctx.fill();
  ctx.textAlign = 'left';
  if (outline) ctx.strokeText('pique', x0 + dot * 2 + size * 0.3, y);
  ctx.fillStyle = colors.paper;
  ctx.fillText('pique', x0 + dot * 2 + size * 0.3, y);
}

function numbers(ctx: CanvasRenderingContext2D, d: PostData, top: number) {
  const x = 72;
  ctx.textAlign = 'left';
  ctx.fillStyle = d.accent;
  ctx.font = `36px ${fonts.bodyStrong}`;
  ctx.fillText(d.kicker, x, top);
  ctx.fillStyle = colors.paper;
  ctx.font = `210px ${fonts.display}`;
  ctx.fillText(d.big, x - 8, top + 200);
  const bw = ctx.measureText(d.big).width;
  ctx.font = `44px ${fonts.bodyStrong}`;
  ctx.fillText(d.bigUnit, x + bw + 6, top + 200);
  let sx = x;
  for (const [label, value] of d.stats) {
    ctx.fillStyle = colors.paperMuted;
    ctx.font = `32px ${fonts.body}`;
    ctx.fillText(label, sx, top + 280);
    ctx.fillStyle = colors.paper;
    ctx.font = `60px ${fonts.display}`;
    ctx.fillText(value, sx, top + 345);
    sx += Math.max(ctx.measureText(value).width, 200) + 70;
  }
  ctx.fillStyle = 'rgba(243,240,232,0.18)';
  ctx.fillRect(x, top + 395, W - 2 * x, 2);
  ctx.fillStyle = colors.paperMuted;
  ctx.font = `30px ${fonts.body}`;
  ctx.fillText('Pique-esconde de verdade, pela cidade.', x, top + 450);
  ctx.textAlign = 'right';
  ctx.fillStyle = colors.paper;
  ctx.font = `32px ${fonts.bodyStrong}`;
  ctx.fillText('pique.expo.app', W - x, top + 450);
}

function bottomFade(ctx: CanvasRenderingContext2D, h: number, from: number) {
  const g = ctx.createLinearGradient(0, from, 0, h);
  g.addColorStop(0, 'rgba(11,14,17,0)');
  g.addColorStop(0.45, 'rgba(11,14,17,0.82)');
  g.addColorStop(1, 'rgba(11,14,17,0.96)');
  ctx.fillStyle = g;
  ctx.fillRect(0, from, W, h - from);
}

export async function renderPost(kind: 'mapa' | 'selfie' | 'adesivo', d: PostData, opts: { map?: HTMLCanvasElement | null; photo?: string | null }): Promise<Blob | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  await document.fonts?.ready;
  const H = kind === 'adesivo' ? W : 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  if (kind === 'adesivo') {
    // fundo transparente: só o trajeto, o número e a marca, com contorno escuro para ler em qualquer foto
    const p = trailPath(d.trail, 520, 330, 20);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (p) {
      ctx.save();
      ctx.translate((W - 520) / 2, 90);
      const path = new Path2D(p.path);
      ctx.strokeStyle = 'rgba(11,14,17,0.55)';
      ctx.lineWidth = 26;
      ctx.stroke(path);
      ctx.strokeStyle = d.accent;
      ctx.lineWidth = 14;
      ctx.stroke(path);
      ctx.restore();
    }
    const cx = W / 2;
    const text = (t: string, font: string, color: string, y: number) => {
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.lineWidth = 14;
      ctx.strokeStyle = 'rgba(11,14,17,0.75)';
      ctx.strokeText(t, cx, y);
      ctx.fillStyle = color;
      ctx.fillText(t, cx, y);
    };
    text(d.big, `220px ${fonts.display}`, colors.paper, p ? 640 : 520);
    text(d.tagline, `78px ${fonts.display}`, d.accent, p ? 740 : 620);
    text(stickerLine(d), `44px ${fonts.bodyStrong}`, colors.paper, p ? 820 : 700);
    brand(ctx, cx, p ? 930 : 810, 70, 'center', true);
  } else {
    ctx.fillStyle = colors.inkSunken;
    ctx.fillRect(0, 0, W, H);
    if (kind === 'mapa' && opts.map) cover(ctx, opts.map, W, H);
    if (kind === 'selfie' && opts.photo) {
      try {
        cover(ctx, await loadImage(opts.photo), W, H);
      } catch {}
      const g = ctx.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, 'rgba(11,14,17,0.55)');
      g.addColorStop(1, 'rgba(11,14,17,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, 300);
    }
    bottomFade(ctx, H, 640);
    brand(ctx, 72, 120, 64);
    numbers(ctx, d, 840);
  }
  return new Promise((ok) => c.toBlob((b) => ok(b), 'image/png'));
}

// Compartilha a imagem (no celular abre a folha de compartilhar com Instagram,
// WhatsApp...). Sem suporte, baixa o arquivo.
export async function shareImage(blob: Blob, text: string, save = false) {
  const file = new File([blob], 'pique.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!save && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pique.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'saved';
}
