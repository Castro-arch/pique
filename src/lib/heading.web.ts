import { useEffect, useRef, useState } from 'react';

// Para onde o celular está virado (graus, 0 = norte) no navegador.
// iPhone: precisa de permissão, que só pode ser pedida num toque da pessoa;
// por isso pedimos no primeiro toque em qualquer lugar do site. Lá a direção
// vem pronta em webkitCompassHeading. Android: deviceorientationabsolute,
// com a conta completa (alfa, beta e gama) para valer com o celular em pé.

type IOSOrientation = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };
type OrientationWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };

function askOnTouch() {
  const D = typeof DeviceOrientationEvent !== 'undefined' ? (DeviceOrientationEvent as IOSOrientation) : null;
  if (D?.requestPermission) D.requestPermission().catch(() => {});
  ['touchend', 'click'].forEach((t) => document.removeEventListener(t, askOnTouch, true));
}
if (typeof document !== 'undefined') ['touchend', 'click'].forEach((t) => document.addEventListener(t, askOnTouch, true));

// Direção da parte de cima do celular a partir dos três ângulos (W3C).
// Deitado ou em pé, dá para onde a pessoa está olhando.
function compass(alpha: number, beta: number, gamma: number) {
  const r = Math.PI / 180;
  const cX = Math.cos(beta * r);
  const cY = Math.cos(gamma * r);
  const cZ = Math.cos(alpha * r);
  const sX = Math.sin(beta * r);
  const sY = Math.sin(gamma * r);
  const sZ = Math.sin(alpha * r);
  const vx = -cZ * sY - sZ * sX * cY;
  const vy = -sZ * sY + cZ * sX * cY;
  let h = Math.atan(vx / vy);
  if (vy < 0) h += Math.PI;
  else if (vx < 0) h += 2 * Math.PI;
  return (h * 180) / Math.PI;
}

// Tela deitada (paisagem) gira a referência.
const screenAngle = () => (typeof screen !== 'undefined' && screen.orientation ? screen.orientation.angle : 0) || 0;

// Média que entende a volta do 359° para o 0°: o biquinho não treme.
function smooth(prev: number | null, next: number, k = 0.35) {
  if (prev === null) return next;
  const d = ((next - prev + 540) % 360) - 180;
  return (prev + d * k + 360) % 360;
}

export function useHeading(active: boolean) {
  const [deg, setDeg] = useState<number | null>(null);
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    let ios = false;
    const push = (h: number) => {
      const v = smooth(last.current, (h + screenAngle() + 360) % 360);
      // só redesenha se mudou de verdade (mais de 2°)
      if (last.current === null || Math.abs(((v - last.current + 540) % 360) - 180) > 2) setDeg(Math.round(v));
      last.current = v;
    };
    const onIOS = (e: Event) => {
      const c = (e as OrientationWithCompass).webkitCompassHeading;
      if (typeof c === 'number' && c >= 0) {
        ios = true;
        // no iPhone a direção já vem pronta e já conta a tela girada
        last.current = smooth(last.current, c);
        setDeg(Math.round(last.current));
      }
    };
    const onAbsolute = (e: Event) => {
      if (ios) return;
      const { alpha, beta, gamma } = e as DeviceOrientationEvent;
      if (typeof alpha === 'number' && typeof beta === 'number' && typeof gamma === 'number') push(compass(alpha, beta, gamma));
    };
    window.addEventListener('deviceorientation', onIOS);
    window.addEventListener('deviceorientationabsolute', onAbsolute);
    return () => {
      window.removeEventListener('deviceorientation', onIOS);
      window.removeEventListener('deviceorientationabsolute', onAbsolute);
    };
  }, [active]);
  return deg;
}
