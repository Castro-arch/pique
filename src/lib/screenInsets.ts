import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Bordas da tela ocupadas pelo sistema (relógio, indicador de início).
// No app vem do react-native-safe-area-context; no site, ver screenInsets.web.ts.
export function useScreenInsets() {
  const { top, bottom } = useSafeAreaInsets();
  return { top, bottom };
}
