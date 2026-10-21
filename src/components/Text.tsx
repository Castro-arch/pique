import { Text as RNText, type TextProps, StyleSheet } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

// Escala tipográfica do design:
// - display/h1/h2/h3: Bricolage Grotesque 800, sempre com letras bem juntas
// - number: números do jogo (tempo, distância, pings)
// - body/muted/small/label: Inter
export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'number'
  | 'body'
  | 'strong'
  | 'muted'
  | 'small'
  | 'label'
  | 'error'
  // nomes antigos, mantidos para as telas da fase 1
  | 'hero'
  | 'title'
  | 'caption';

type Props = TextProps & { variant?: TextVariant; color?: string };

export function Text({ variant = 'body', color, style, ...rest }: Props) {
  return <RNText style={[styles[variant], color ? { color } : null, style]} {...rest} />;
}

const styles = StyleSheet.create({
  display: {
    fontFamily: fonts.display,
    fontSize: 56,
    lineHeight: 54,
    letterSpacing: -2.8,
    color: colors.paper,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -1.8,
    color: colors.paper,
  },
  h2: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -1,
    color: colors.paper,
  },
  h3: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: colors.paper,
  },
  number: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: colors.paper,
    fontVariant: ['tabular-nums'],
  },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.paper },
  strong: { fontFamily: fonts.bodyStrong, fontSize: 15, lineHeight: 21, color: colors.paper },
  muted: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.paperMuted },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.paperMuted },
  label: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, color: colors.paperMuted },
  error: { fontFamily: fonts.bodyStrong, fontSize: 14, lineHeight: 20, color: colors.amber },
  hero: {
    fontFamily: fonts.display,
    fontSize: 56,
    lineHeight: 54,
    letterSpacing: -2.8,
    color: colors.paper,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -1,
    color: colors.paper,
  },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.paperMuted },
});

// Título com o ponto final colorido, marca registrada das telas.
export function Headline({
  children,
  dot = colors.lime,
  variant = 'h1',
  mark = '.',
  style,
}: {
  children: string;
  dot?: string;
  variant?: 'display' | 'h1' | 'h2';
  mark?: string;
  style?: TextProps['style'];
}) {
  return (
    <Text variant={variant} accessibilityRole="header" style={style}>
      {children}
      <Text variant={variant} color={dot}>
        {mark}
      </Text>
    </Text>
  );
}
