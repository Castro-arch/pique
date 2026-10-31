import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { Pressy } from '@/components/Motion';

import { Text } from '@/components/Text';
import { colors, fonts, radius, touch } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'danger' | 'dark' | 'ghost' | 'link';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  size?: 'lg' | 'md';
  style?: ViewStyle;
  accessibilityHint?: string;
};

const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.lime, fg: colors.limeInk },
  secondary: { bg: colors.inkRaised, fg: colors.paper, border: colors.inkBorder },
  danger: { bg: colors.pink, fg: colors.paper },
  dark: { bg: colors.limeInk, fg: colors.paper },
  ghost: { bg: 'transparent', fg: colors.paper },
  link: { bg: 'transparent', fg: colors.paperMuted },
};

// Botão padrão: 56 de altura, cantos 24. Uma ação principal por tela.
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  size = 'lg',
  style,
  accessibilityHint,
}: Props) {
  const inactive = disabled || loading;
  const p = palette[variant];
  const height = variant === 'link' ? touch : size === 'lg' ? 56 : 48;
  return (
    <Pressy
      scaleTo={variant === 'link' ? 0.94 : 0.96}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={[
        styles.base,
        {
          minHeight: height,
          backgroundColor: p.bg,
          borderRadius: size === 'lg' ? radius.xl : radius.lg,
        },
        p.border ? { borderWidth: 1, borderColor: p.border } : null,
        inactive && styles.inactive,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text
            style={{
              color: p.fg,
              fontFamily: fonts.bodyStrong,
              fontSize: variant === 'link' || size === 'md' ? 15 : 16,
            }}>
            {label}
          </Text>
        </View>
      )}
    </Pressy>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inactive: { opacity: 0.4 },
});
