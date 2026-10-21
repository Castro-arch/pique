import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

// Folha que sobe da base (menus, confirmações, perfil de jogador).
// Fica por cima do que estiver atrás, que é escurecido pelo véu.
export function Sheet({
  children,
  top,
  style,
  veil = true,
}: {
  children: ReactNode;
  top?: number; // distância do topo; sem isso a folha abraça o conteúdo
  style?: ViewStyle;
  veil?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <>
      {veil ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.veil]} /> : null}
      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          top !== undefined ? { top } : null,
          { paddingBottom: Math.max(insets.bottom + 8, 34) },
          style,
        ]}>
        <View style={styles.grab} />
        {children}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  veil: { backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.inkRaised,
    borderTopWidth: 1,
    borderColor: colors.inkBorder,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  grab: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.inkBorder, alignSelf: 'center' },
});
