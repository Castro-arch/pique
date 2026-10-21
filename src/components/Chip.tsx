import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

type Tone = 'neutral' | 'runner' | 'hunter' | 'hunterSolid' | 'warning' | 'runnerSolid' | 'dark';

const tones: Record<Tone, { bg: string; fg: string; border?: string }> = {
  neutral: { bg: colors.inkRaised, fg: colors.paperMuted, border: colors.inkBorder },
  runner: { bg: colors.limeTint, fg: colors.lime },
  runnerSolid: { bg: colors.lime, fg: colors.limeInk },
  hunter: { bg: colors.pinkTint, fg: colors.pinkSoft },
  hunterSolid: { bg: colors.pink, fg: colors.paper },
  warning: { bg: colors.amber, fg: colors.amberInk },
  dark: { bg: 'rgba(16,20,24,0.92)', fg: colors.paper, border: colors.inkBorder },
};

// Selo em pílula: estado da partida, papel, aviso.
export function Chip({
  label,
  tone = 'neutral',
  icon,
  dot,
  style,
}: {
  label: string;
  tone?: Tone;
  icon?: ReactNode;
  dot?: string;
  style?: ViewStyle;
}) {
  const t = tones[tone];
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: t.bg },
        t.border ? { borderWidth: 1, borderColor: t.border } : null,
        style,
      ]}>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      {icon}
      <Text style={{ color: t.fg, fontFamily: fonts.bodyStrong, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
