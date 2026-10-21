import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled, loading }: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.limeInk : colors.paper} />
      ) : (
        <Text
          variant="strong"
          style={{ color: variant === 'primary' ? colors.limeInk : colors.paper }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primary: { backgroundColor: colors.lime },
  secondary: { backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder },
  ghost: { backgroundColor: 'transparent' },
  inactive: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }] },
});
