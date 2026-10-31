import { useEffect, useState } from 'react';

// Para onde o celular está virado (graus, 0 = norte) no navegador.
// iPhone: precisa de permissão, que só pode ser pedida num toque da pessoa;
// por isso pedimos no primeiro toque em qualquer lugar do site. Lá a direção
// vem pronta em webkitCompassHeading. Android: deviceorientationabsolute.

type IOSOrientation = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };
type OrientationWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };

function askOnTouch() {
  const D = typeof DeviceOrientationEvent !== 'undefined' ? (DeviceOrientationEvent as IOSOrientation) : null;
  if (D?.requestPermission) D.requestPermission().catch(() => {});
  ['touchend', 'click'].forEach((t) => document.removeEventListener(t, askOnTouch, true));
}
if (typeof document !== 'undefined') ['touchend', 'click'].forEach((t) => document.addEventListener(t, askOnTouch, true));

export function useHeading(active: boolean) {
  const [deg, setDeg] = useState<number | null>(null);
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    const onIOS = (e: Event) => {
      const c = (e as OrientationWithCompass).webkitCompassHeading;
      if (typeof c === 'number' && c >= 0) setDeg(c);
    };
    const onAbsolute = (e: Event) => {
      const a = (e as DeviceOrientationEvent).alpha;
      if (typeof a === 'number') setDeg((360 - a) % 360);
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
