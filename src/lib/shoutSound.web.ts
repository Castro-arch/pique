import { Asset } from 'expo-asset';

// No iPhone (Safari e Chrome) o navegador só deixa um <audio> tocar se ele já
// tocou uma vez depois de um toque da pessoa. A tela do grito abre sozinha,
// sem toque, então o som era bloqueado. Por isso o mesmo <audio> é "destravado"
// no primeiro toque em qualquer lugar do site (toca mudo e pausa) e fica
// guardado: quando o grito chega, ele já pode tocar.
export const SHOUT_SOUND = require('../../assets/sounds/grito.wav');

let el: HTMLAudioElement | null = null;
let unlocked = false;

function audio() {
  if (!el && typeof Audio !== 'undefined') {
    el = new Audio(Asset.fromModule(SHOUT_SOUND).uri);
    el.loop = true;
    el.preload = 'auto';
  }
  return el;
}

function unlock() {
  const a = audio();
  if (!a || unlocked) return;
  a.muted = true;
  a.play()
    .then(() => {
      a.pause();
      a.currentTime = 0;
      a.muted = false;
      unlocked = true;
      ['touchend', 'click', 'keydown'].forEach((t) => document.removeEventListener(t, unlock, true));
    })
    .catch(() => {});
}

if (typeof document !== 'undefined') {
  ['touchend', 'click', 'keydown'].forEach((t) => document.addEventListener(t, unlock, true));
}

// true: tocou por aqui (a tela não precisa tocar pelo expo-audio).
export function playShout() {
  const a = audio();
  if (!a) return false;
  a.muted = false;
  a.volume = 1;
  a.currentTime = 0;
  a.play().catch(() => {});
  return true;
}

export function stopShout() {
  if (!el) return;
  el.pause();
  el.currentTime = 0;
}
