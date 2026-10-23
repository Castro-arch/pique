import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { errorInfo } from '@/lib/game';
import { FRAMES } from '@/lib/cosmetics';
import { useMe } from '@/lib/useMe';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

type Item = { id: string; name: string; price: string | null; isNew: boolean; owned: boolean; equipped: boolean };

// 11.6 Loja de cosméticos e 11.7 o item. Só visual: ninguém compra vantagem.
// As compras de verdade chegam com o app nas lojas (RevenueCat); até lá, o
// que é pago aparece com o preço e o botão explica.
export default function Loja() {
  const shop = useQuery(api.cosmetics.shop, {});
  const me = useMe();
  const [open, setOpen] = useState<Item | null>(null);

  return (
    <Screen>
      <View style={styles.head}>
        <Text style={styles.title}>
          Loja<Text style={[styles.title, { color: colors.lime }]}>.</Text>
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => router.back()} hitSlop={10}>
          <X size={22} color={colors.paper} />
        </Pressable>
      </View>
      <Text variant="muted" style={{ marginTop: 6 }}>Só visual. Ninguém compra vantagem no Pique.</Text>

      <View style={styles.featured}>
        <Avatar name={me.name} source={me.photo} size={76} state="runner" frame="chamas" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, letterSpacing: 0.6, color: colors.amber }}>PACOTE DA SEMANA</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 25, marginTop: 3 }}>Noite em chamas</Text>
          <Text style={{ fontSize: 12, color: '#FFD9B0', marginTop: 4 }}>Moldura, rastro e som do grito · em breve</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
        {['Molduras', 'Rastros', 'Som do grito'].map((t, i) => (
          <View key={t} style={[styles.chip, i === 0 ? { backgroundColor: colors.paper } : { borderWidth: 1, borderColor: colors.inkBorder, opacity: 0.5 }]}>
            <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: i === 0 ? colors.ink : colors.paper }}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {(shop?.items ?? []).map((i) => (
          <Pressable
            key={i.id}
            accessibilityRole="button"
            accessibilityLabel={`${i.name}, ${i.equipped ? 'equipada' : i.owned ? 'sua' : i.price}`}
            onPress={() => setOpen(i)}
            style={[styles.card, i.equipped && { borderColor: colors.lime }]}>
            {i.isNew ? (
              <View style={styles.new}>
                <Text style={{ fontSize: 10, fontFamily: fonts.bodyStrong, color: colors.pinkInk }}>NOVO</Text>
              </View>
            ) : null}
            <View style={{ height: 92, alignItems: 'center', justifyContent: 'center' }}>
              <Avatar name={me.name} source={me.photo} size={64} state="runner" frame={i.id} />
            </View>
            <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong, marginTop: 6 }}>{i.name}</Text>
            <Text variant="label">Moldura</Text>
            <View style={[styles.price, i.equipped ? { backgroundColor: colors.limeTint } : i.owned ? { backgroundColor: colors.inkBorder } : { backgroundColor: colors.paper }]}>
              <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: i.equipped ? colors.lime : i.owned ? colors.paper : colors.ink }}>
                {i.equipped ? 'Equipada' : i.owned ? (i.price ? 'Sua' : 'Grátis') : i.price}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <ItemSheet item={open} name={me.name} photo={me.photo} onClose={() => setOpen(null)} />
    </Screen>
  );
}

function ItemSheet({ item, name, photo, onClose }: { item: Item | null; name: string; photo?: number; onClose: () => void }) {
  const equip = useMutation(api.cosmetics.equip);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const color = item ? FRAMES[item.id]?.colors[1] ?? colors.lime : colors.lime;

  const toggle = async () => {
    if (!item) return;
    setBusy(true);
    setError(null);
    try {
      await equip({ itemId: item.equipped ? null : item.id });
      onClose();
    } catch (e) {
      setError(errorInfo(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={onClose} />
        {item ? (
          <>
            <View style={{ alignItems: 'center', marginBottom: 24 }} pointerEvents="none">
              <Avatar name={name} source={photo} size={140} state="runner" frame={item.id} />
              <View style={[styles.youTag, { backgroundColor: color }]}>
                <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.ink }}>Você · como os outros te veem</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center', marginTop: 20 }}>
                {[
                  [42, 'No mapa'],
                  [28, 'No Radio'],
                  [60, 'No placar'],
                ].map(([s, l]) => (
                  <View key={l} style={{ alignItems: 'center', gap: 6 }}>
                    <Avatar name={name} source={photo} size={s as number} state="runner" frame={item.id} />
                    <Text variant="label">{l}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View accessibilityViewIsModal style={styles.sheet}>
              <View style={styles.grab} />
              <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 0.5, color, marginTop: 16 }}>MOLDURA</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 36 }}>
                {item.name}
                <Text style={{ fontFamily: fonts.display, fontSize: 34, color }}>.</Text>
              </Text>
              <Text variant="muted" style={{ marginTop: 8 }}>
                {FRAMES[item.id]?.preview} Aparece em volta da sua foto no mapa, no Radio e no placar. Todo mundo da partida vê.
              </Text>
              <View style={styles.note}>
                <Check size={16} color={colors.lime} strokeWidth={3} />
                <Text style={{ flex: 1, fontSize: 13, color: colors.paperMuted }}>Só visual: não muda o ping, a visibilidade nem a pega.</Text>
              </View>
              {error ? <Text variant="error" style={{ marginTop: 8 }}>{error}</Text> : null}
              {item.owned ? (
                <Button label={item.equipped ? 'Tirar a moldura' : 'Equipar'} variant={item.equipped ? 'secondary' : 'primary'} loading={busy} onPress={toggle} style={{ marginTop: 16 }} />
              ) : (
                <>
                  <Button label={`Comprar · ${item.price}`} disabled style={{ marginTop: 16 }} />
                  <Text variant="label" style={{ textAlign: 'center', marginTop: 8 }}>
                    As compras abrem quando o Pique chegar na App Store e na Play Store.
                  </Text>
                </>
              )}
              <Button label="Agora não" variant="link" onPress={onClose} />
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: -1.6 },
  featured: {
    marginTop: 14,
    borderRadius: radius.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#2A0610',
    borderWidth: 1,
    borderColor: '#5A1A28',
  },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 12 },
  card: {
    width: '48.5%',
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
  },
  new: { position: 'absolute', left: 10, top: 10, backgroundColor: colors.pink, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, zIndex: 1 },
  price: { marginTop: 8, height: 30, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,12,14,0.94)', justifyContent: 'flex-end' },
  youTag: { marginTop: 14, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  sheet: {
    backgroundColor: colors.inkRaised,
    borderTopWidth: 1,
    borderColor: colors.inkBorder,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  grab: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.inkBorder, alignSelf: 'center' },
  note: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 14, backgroundColor: colors.ink, borderRadius: radius.md, padding: 12 },
});
