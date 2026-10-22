import { View } from 'react-native';

import { Segmented } from '@/components/Controls';
import { Text } from '@/components/Text';
import { colors } from '@/theme/tokens';

export type Side = 'runner' | 'hunter' | 'draw';

export const sideLabel: Record<Side, string> = { runner: 'Corredor', hunter: 'Caçador', draw: 'Sorteio' };

// Marcador do papel: bolinha cheia (corredor), anel (caçador) ou nada (sorteio).
export function RoleDot({ side, size = 12, color }: { side: Side; size?: number; color?: string }) {
  if (side === 'draw') return null;
  return side === 'runner' ? (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? colors.lime }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: size / 4, borderColor: color ?? colors.pink }} />
  );
}

// "● Corredor" colorido, à direita das linhas de jogador.
export function RoleTag({ side }: { side: Side }) {
  const color = side === 'runner' ? colors.lime : side === 'hunter' ? colors.pink : colors.paperMuted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <RoleDot side={side} size={10} />
      <Text style={{ fontSize: 13, color }}>{sideLabel[side]}</Text>
    </View>
  );
}

// "Você joga como": Caçador / Corredor / Sorteio.
export function SidePicker({ value, onChange }: { value: Side; onChange: (s: Side) => void }) {
  return (
    <Segmented<Side>
      value={value}
      onChange={onChange}
      options={[
        { value: 'hunter', label: 'Caçador', icon: <RoleDot side="hunter" color={value === 'hunter' ? colors.paper : undefined} />, active: { bg: colors.pink, fg: colors.paper } },
        { value: 'runner', label: 'Corredor', icon: <RoleDot side="runner" color={value === 'runner' ? colors.limeInk : undefined} />, active: { bg: colors.lime, fg: colors.limeInk } },
        { value: 'draw', label: 'Sorteio' },
      ]}
    />
  );
}
