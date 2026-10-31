import { router, useLocalSearchParams } from 'expo-router';
import { Ban, ChevronRight, Flag, VolumeX } from '@/components/icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { RoleDot } from '@/components/RoleTag';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { players } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

// 5.5 Perfil de outro jogador, com silenciar, bloquear e denunciar.
export default function Jogador() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = players.find((x) => x.id === id) ?? players[1];
  const hunter = p.role === 'hunter';

  return (
    <View style={{ flex: 1 }}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <Sheet top={170}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 }}>
          <Avatar source={p.photo} size={72} state={p.role} label={p.name} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.8 }}>{p.name}</Text>
            <Text variant="small">@{p.username} · joga desde agosto</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {p.role !== 'draw' ? (
            <Chip
              label={`${hunter ? 'Caçador' : 'Corredor'} nesta partida`}
              tone={hunter ? 'hunter' : 'runner'}
              icon={<RoleDot side={p.role} size={10} />}
            />
          ) : (
            <Chip label="Vai no sorteio" />
          )}
          <Chip label="12 rodadas com você" tone="runner" />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <Stat label="Rodadas" value="48" />
          <Stat label="Pegas" value="61" color={colors.pink} />
          <Stat label="Recorde" value="30:00" />
        </View>

        <Text variant="label" style={{ marginTop: 18, marginBottom: 6, marginLeft: 6 }}>Segurança</Text>
        <View style={styles.list}>
          <Item icon={<VolumeX size={18} color={colors.paper} />} label="Silenciar no Radio" />
          <Item icon={<Ban size={18} color={colors.paper} />} label={`Bloquear o ${p.name}`} />
          <Item
            icon={<Flag size={18} color={colors.pink} />}
            label="Denunciar"
            danger
            last
            onPress={() => router.replace({ pathname: '/denunciar', params: { id: p.id } })}
          />
        </View>
        <Text variant="label" style={{ textAlign: 'center', marginTop: 10 }}>
          O {p.name} não fica sabendo se você silenciar, bloquear ou denunciar.
        </Text>
      </Sheet>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ fontSize: 11, color: colors.paperMuted }}>{label}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color: color ?? colors.paper }}>{value}</Text>
    </View>
  );
}

function Item({ icon, label, danger, last, onPress }: { icon: React.ReactNode; label: string; danger?: boolean; last?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.item, !last && { borderBottomWidth: 1, borderBottomColor: colors.inkBorder }]}>
      {icon}
      <Text style={{ flex: 1, fontSize: 15, color: danger ? colors.pink : colors.paper }}>{label}</Text>
      <ChevronRight size={18} color={colors.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12 },
  list: { backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: radius.lg },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16 },
});
