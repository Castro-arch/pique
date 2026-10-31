// No app o som do grito toca direto pelo expo-audio (tela 10.6), então aqui
// não há nada para destravar. No site, ver shoutSound.web.ts.
export const SHOUT_SOUND = require('../../assets/sounds/grito.wav');

export function playShout() {
  return false; // false: quem chamou toca pelo expo-audio
}

export function stopShout() {}
