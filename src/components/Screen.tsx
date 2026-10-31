import type { ReactNode } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEntrance } from '@/components/Motion';
import { colors, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  background?: string;
  scroll?: boolean;
  padded?: boolean; // false nas telas de mapa, que desenham até a borda
  style?: ViewStyle;
};

// Moldura das telas: fundo, área segura e o ritmo 20 / 56 / 34 do design.
// Toda tela rola quando o conteúdo não cabe (celular pequeno, barra do
// navegador ocupando espaço). Quando cabe, o Spacer continua empurrando
// os botões para a base, porque o conteúdo cresce até a altura da tela.
// `scroll` fica por compatibilidade: hoje toda tela rola.
export function Screen({ children, background = colors.ink, scroll: _scroll, padded = true, style }: Props) {
  const insets = useSafeAreaInsets();
  const enter = useEntrance({ distance: 18 });
  const pad: ViewStyle = padded
    ? {
        paddingTop: Math.max(insets.top + 12, spacing.screenTop),
        paddingBottom: Math.max(insets.bottom + 8, spacing.screenBottom),
        paddingHorizontal: spacing.screenX,
      }
    : {};

  const body = (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.grow, pad, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.grow, enter]}>{children}</Animated.View>
    </ScrollView>
  );

  return (
    <View style={[styles.flex, { backgroundColor: background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
      </KeyboardAvoidingView>
    </View>
  );
}

// Empurra o que vem depois para a base da tela (zona do polegar).
export function Spacer() {
  return <View style={styles.flex} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
});
