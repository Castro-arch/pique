import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

// Aviso no estilo de notificação do celular (permissão de avisos, tela bloqueada).
export function Notice({
  title,
  body,
  when,
  opacity = 1,
  app = 'PIQUE',
  icon,
}: {
  title: string;
  body: string;
  when: string;
  opacity?: number;
  app?: string;
  icon?: ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        backgroundColor: colors.inkRaised,
        borderWidth: 1,
        borderColor: colors.inkBorder,
        borderRadius: radius.lg,
        padding: 12,
        opacity,
      }}>
      {icon ?? (
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.limeInk }} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="label">{app}</Text>
          <Text variant="label">{when}</Text>
        </View>
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14, marginTop: 2 }}>{title}</Text>
        <Text variant="small">{body}</Text>
      </View>
    </View>
  );
}
