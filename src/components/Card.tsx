import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Text } from '@/components/Text';
import { colors, radius } from '@/theme/tokens';

export function Card({
  children,
  style,
  tone = 'raised',
}: {
  children: ReactNode;
  style?: ViewStyle;
  tone?: 'raised' | 'sunken' | 'deep';
}) {
  const bg = tone === 'raised' ? colors.inkRaised : tone === 'sunken' ? colors.inkSunken : colors.ink;
  const border = tone === 'sunken' ? colors.inkLine : colors.inkBorder;
  return <View style={[styles.card, { backgroundColor: bg, borderColor: border }, style]}>{children}</View>;
}

// Rótulo pequeno acima de um grupo de linhas ("Conta", "Privacidade"...).
export function SectionLabel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <Text variant="label" style={[styles.section, style as never]}>
      {children}
    </Text>
  );
}

// Grupo de linhas dentro de um card, separadas por uma linha fina.
export function ListGroup({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.group, style]}>{children}</View>;
}

type RowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  last?: boolean;
  danger?: boolean;
  onPress?: () => void;
};

export function ListRow({
  title,
  subtitle,
  value,
  leading,
  trailing,
  chevron,
  last,
  danger,
  onPress,
}: RowProps) {
  const content = (
    <View style={[styles.row, !last && styles.rowLine]}>
      {leading}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, color: danger ? colors.pink : colors.paper }}>{title}</Text>
        {subtitle ? <Text variant="label" style={{ marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {value ? <Text variant="muted">{value}</Text> : null}
      {trailing}
      {chevron ? <ChevronRight size={18} color={colors.inkMuted} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 16 },
  section: { marginLeft: 6, marginBottom: 6, marginTop: 14 },
  group: {
    backgroundColor: colors.inkRaised,
    borderColor: colors.inkBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.inkBorder },
});
