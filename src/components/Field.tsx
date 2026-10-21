import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

type Props = TextInputProps & { label: string };

export function Field({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text variant="caption">{label}</Text>
      <TextInput
        placeholderTextColor={colors.paperMuted}
        selectionColor={colors.lime}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  input: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    backgroundColor: colors.inkRaised,
    paddingHorizontal: 16,
    color: colors.paper,
    fontFamily: fonts.bodyStrong,
    fontSize: 18,
  },
});
