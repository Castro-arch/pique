import { Text as RNText, type TextProps, StyleSheet } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

type Variant = 'hero' | 'title' | 'body' | 'strong' | 'caption' | 'error';

type Props = TextProps & { variant?: Variant };

export function Text({ variant = 'body', style, ...rest }: Props) {
  return <RNText style={[styles[variant], style]} {...rest} />;
}

const styles = StyleSheet.create({
  hero: { fontFamily: fonts.display, fontSize: 56, lineHeight: 56, color: colors.paper },
  title: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 32, color: colors.paper },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.paper },
  strong: { fontFamily: fonts.bodyStrong, fontSize: 16, lineHeight: 22, color: colors.paper },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.paperMuted },
  error: { fontFamily: fonts.bodyStrong, fontSize: 14, lineHeight: 20, color: colors.coral },
});
