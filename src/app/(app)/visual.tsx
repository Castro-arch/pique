import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Smile, Spline, Volume2 } from '@/components/icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Screen, Spacer } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useMe } from '@/lib/useMe';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

// 11.8 Meu visual: o que está equipado. Por enquanto só a moldura funciona;
// rastro, som do grito e figurinhas chegam depois.
export default function Visual() {
  const shop = useQuery(api.cosmetics.shop, {});
  const me = useMe();
  const frame = shop?.items.find((i) => i.equipped);
  const owned = shop?.items.filter((i) => i.owned).length ?? 0;

  return (
    <Screen>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={24} color={colors.paper} />
        </Pressable>
        <Text variant="label">{owned} {owned === 1 ? 'item seu' : 'itens seus'}</Text>
      </View>
      <Text style={styles.title}>
        Meu visual<Text style={[styles.title, { color: colors.lime }]}>.</Text>
      </Text>

      <View style={styles.preview}>
        <View style={styles.previewTag}>
          <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong }}>Prévia no mapa</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Avatar name={me.name} source={me.photo} size={56} state="runner" glow frame={shop?.frame} />
          <View style={styles.you}>
            <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, color: colors.limeInk }}>Você</Text>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <Row
          label="Moldura"
          value={frame?.name ?? 'Nenhuma'}
          icon={<Avatar name={me.name} source={me.photo} size={36} state="runner" frame={shop?.frame} />}
          onPress={() => router.push('/loja')}
        />
        <Row label="Rastro no replay" value="Em breve" icon={<Spline size={24} color={colors.amber} />} />
        <Row label="Som do grito" value="Em breve" icon={<Volume2 size={24} color={colors.pink} />} />
        <Row label="Figurinhas do Radio" value="Em breve" icon={<Smile size={24} color={colors.lime} />} last />
      </View>

      <Spacer />
      <Button label="Ir para a loja" onPress={() => router.push('/loja')} />
    </Screen>
  );
}

function Row({ label, value, icon, onPress, last }: { label: string; value: string; icon: ReactNode; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.inkBorder }, !onPress && { opacity: 0.55 }]}>
      <View style={{ width: 48, alignItems: 'center' }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text variant="label">{label}</Text>
        <Text style={{ fontSize: 16, fontFamily: fonts.bodyStrong, marginTop: 2 }}>{value}</Text>
      </View>
      {onPress ? <ChevronRight size={18} color={colors.paperMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  title: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: -1.4, marginTop: 6 },
  preview: {
    marginTop: 18,
    height: 180,
    borderRadius: 28,
    backgroundColor: colors.inkSunken,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTag: { position: 'absolute', left: 12, top: 12, backgroundColor: colors.ink, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  you: { backgroundColor: colors.lime, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68 },
});
