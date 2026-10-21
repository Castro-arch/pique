import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

type Props = TextInputProps & { label: string; trailing?: React.ReactNode; invalid?: boolean };

// Campo de texto: rótulo pequeno em cima, borda verde quando está em foco.
export function Field({ label, trailing, invalid, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const borderColor = invalid ? colors.amber : focused ? colors.lime : colors.inkBorder;
  return (
    <View style={styles.wrap}>
      <Text variant="label" style={styles.label}>
        {label}
      </Text>
      <View style={[styles.box, { borderColor, borderWidth: focused || invalid ? 2 : 1 }]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.inkMuted}
          selectionColor={colors.lime}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { marginLeft: 6 },
  box: {
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.inkRaised,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 52,
    color: colors.paper,
    fontFamily: fonts.body,
    fontSize: 17,
  },
});
