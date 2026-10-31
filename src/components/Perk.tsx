import { Check } from '@/components/icons';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

// Linha "✓ benefício" das telas verdes de hospedagem e compra.
export function Perk({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.limeInk, alignItems: 'center', justifyContent: 'center' }}>
        <Check size={16} color={colors.lime} strokeWidth={3} />
      </View>
      <Text style={{ flex: 1, fontSize: 16, fontFamily: fonts.bodyMedium, color: colors.limeInk }}>{children}</Text>
    </View>
  );
}
