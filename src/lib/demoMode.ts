import { useSyncExternalStore } from 'react';

// Modo demonstração: libera todas as telas sem login, com os dados de src/lib/demo.ts.
// Só existe em desenvolvimento (__DEV__); é ligado pela Galeria de telas.
let enabled = false;
const listeners = new Set<() => void>();

export function setDemoMode(on: boolean) {
  if (!__DEV__) return;
  enabled = on;
  listeners.forEach((l) => l());
}

export function useDemoMode() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => enabled,
    () => enabled,
  );
}
