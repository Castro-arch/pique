import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

// Para onde o celular está virado (graus, 0 = norte), pela bússola.
// No site, ver heading.web.ts.
export function useHeading(active: boolean) {
  const [deg, setDeg] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    Location.watchHeadingAsync((h) => {
      const v = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      if (v >= 0) setDeg(v);
    })
      .then((s) => (cancelled ? s.remove() : (sub = s)))
      .catch(() => {});
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [active]);
  return deg;
}
