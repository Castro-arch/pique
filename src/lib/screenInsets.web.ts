import { useEffect, useState } from 'react';

// No site o expo-router entrega área segura zerada. Só que no iPhone o Safari
// desenha a página por baixo do relógio e da barra de baixo (viewport-fit=cover),
// então lemos o env(safe-area-inset-*) do próprio CSS.
function measure() {
  if (typeof document === 'undefined') return { top: 0, bottom: 0 };
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(probe);
  const s = getComputedStyle(probe);
  const out = { top: parseFloat(s.paddingTop) || 0, bottom: parseFloat(s.paddingBottom) || 0 };
  probe.remove();
  return out;
}

export function useScreenInsets() {
  const [insets, setInsets] = useState(measure);
  useEffect(() => {
    const update = () => setInsets(measure());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return insets;
}
