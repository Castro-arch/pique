import { Asset } from 'expo-asset';

// Narração do Como jogar (voz feita no ElevenLabs). Uma fala por passo; os
// passos sem arquivo ficam mudos. No iPhone o navegador só deixa tocar som
// depois de um toque: por isso um único <audio> é destravado no primeiro toque
// (igual ao do grito) e reaproveitado, trocando só o arquivo.
// A duração de cada fala (ms) faz o passo durar o tempo dela + uma folga.
export const NARRATION: { src: number; ms: number }[] = [
  { src: require('../../assets/narracao/01-roda.mp3'), ms: 13790 },
  { src: require('../../assets/narracao/02-zona.mp3'), ms: 11150 },
  { src: require('../../assets/narracao/03-vantagem.mp3'), ms: 12830 },
  { src: require('../../assets/narracao/04-escondidos.mp3'), ms: 9480 },
  { src: require('../../assets/narracao/05-ping.mp3'), ms: 11730 },
  { src: require('../../assets/narracao/06-rastro.mp3'), ms: 12750 },
  { src: require('../../assets/narracao/07-boosts.mp3'), ms: 16770 },
  { src: require('../../assets/narracao/08-despiste.mp3'), ms: 13010 },
  { src: require('../../assets/narracao/09-sombra.mp3'), ms: 9870 },
  { src: require('../../assets/narracao/10-escudo.mp3'), ms: 9640 },
  { src: require('../../assets/narracao/11-perto.mp3'), ms: 13090 },
  { src: require('../../assets/narracao/12-cerco.mp3'), ms: 11730 },
  { src: require('../../assets/narracao/13-pega.mp3'), ms: 14520 },
  { src: require('../../assets/narracao/14-suavez.mp3'), ms: 13790 },
];

const KEY = 'pique.narracao';
let el: HTMLAudioElement | null = null;
let unlocked = false;
// Uma fala de verdade começou enquanto o destravamento ainda rodava: não pausar nem mutar.
let speaking = false;
// Qual passo está tocando e quem quer saber quando a fala acaba.
let current = -1;
const endListeners = new Set<(step: number) => void>();
const preloaded = new Set<number>();

function audio() {
  if (!el && typeof Audio !== 'undefined') {
    el = new Audio();
    el.preload = 'auto';
    el.addEventListener('ended', () => {
      const step = current;
      if (step >= 0) endListeners.forEach((l) => l(step));
    });
  }
  return el;
}

function unlock() {
  const a = audio();
  if (!a || unlocked) return;
  if (!a.src) a.src = Asset.fromModule(NARRATION[0].src).uri;
  a.muted = true;
  a.play()
    .then(() => {
      if (!speaking) a.pause();
      a.muted = false;
      unlocked = true;
      ['touchend', 'click', 'keydown'].forEach((t) => document.removeEventListener(t, unlock, true));
    })
    .catch(() => {});
}

if (typeof document !== 'undefined') {
  ['touchend', 'click', 'keydown'].forEach((t) => document.addEventListener(t, unlock, true));
}

// Toca a fala do passo (ou para, se o passo não tem fala).
export function playNarration(step: number) {
  const a = audio();
  if (!a) return;
  a.pause();
  const n = NARRATION[step];
  if (!n) return;
  current = step;
  a.src = Asset.fromModule(n.src).uri;
  a.currentTime = 0;
  a.muted = false;
  speaking = true;
  a.play().catch(() => (speaking = false));
  preload(step + 1);
}

// Baixa a próxima fala antes da hora: no celular, sem isso, o áudio começa
// atrasado e o passo acabava antes da última palavra.
function preload(step: number) {
  const n = NARRATION[step];
  if (!n || preloaded.has(step) || typeof Audio === 'undefined') return;
  preloaded.add(step);
  const p = new Audio();
  p.preload = 'auto';
  p.src = Asset.fromModule(n.src).uri;
  p.load();
}

// Em que ponto (ms) está a fala deste passo; null se ela não está tocando.
export function narrationPosition(step: number) {
  const a = audio();
  if (!a || current !== step || !speaking || a.currentTime <= 0) return null;
  return a.currentTime * 1000;
}

// Avisa quando a fala de um passo termina de verdade.
export function onNarrationEnd(cb: (step: number) => void) {
  endListeners.add(cb);
  return () => {
    endListeners.delete(cb);
  };
}

export function pauseNarration() {
  audio()?.pause();
}

export function resumeNarration() {
  const a = audio();
  if (a && a.src && a.currentTime > 0 && !a.ended) a.play().catch(() => {});
}

export function stopNarration() {
  const a = audio();
  speaking = false;
  current = -1;
  if (!a) return;
  a.pause();
  a.currentTime = 0;
}

// Som ligado ou desligado fica lembrado neste aparelho (padrão: ligado).
export function narrationOn() {
  try {
    return window.localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

export function setNarrationOn(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // sem armazenamento: vale só nesta visita
  }
}
