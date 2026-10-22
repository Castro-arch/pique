import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

// Seis quadrados (código do e-mail ou da partida) sobre um campo invisível,
// para o teclado, o colar e o preenchimento automático funcionarem normal.
export function CodeInput({
  value,
  onChange,
  length = 6,
  kind = 'numeric',
  invalid,
  label,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  kind?: 'numeric' | 'alphanumeric';
  invalid?: boolean;
  label: string;
  autoFocus?: boolean;
}) {
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const clean = (t: string) =>
    (kind === 'numeric' ? t.replace(/\D/g, '') : t.toUpperCase().replace(/[^A-Z0-9]/g, '')).slice(0, length);

  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityLabel={label}>
      <View style={styles.row}>
        {Array.from({ length }, (_, i) => {
          const char = value[i];
          const active = i === value.length && !invalid;
          return (
            <View
              key={i}
              style={[
                styles.cell,
                invalid
                  ? { borderColor: colors.amber, borderWidth: 2 }
                  : active
                    ? { borderColor: colors.lime, borderWidth: 2 }
                    : null,
              ]}>
              {char ? (
                <Text style={styles.char}>{char}</Text>
              ) : active ? (
                <View style={styles.caret} />
              ) : null}
            </View>
          );
        })}
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(t) => onChange(clean(t))}
        style={styles.hidden}
        autoFocus={autoFocus}
        autoCapitalize="characters"
        autoCorrect={false}
        keyboardType={kind === 'numeric' ? 'number-pad' : 'default'}
        textContentType={kind === 'numeric' ? 'oneTimeCode' : 'none'}
        autoComplete={kind === 'numeric' ? 'one-time-code' : 'off'}
        maxLength={length}
        caretHidden
        accessibilityLabel={label}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 7 },
  cell: {
    flex: 1,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  char: { fontFamily: fonts.display, fontSize: 28, color: colors.paper },
  caret: { width: 2, height: 28, backgroundColor: colors.lime },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
