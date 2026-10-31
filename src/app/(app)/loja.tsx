import { useMutation, useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ArrowPill, BENTO, BentoBackground, BottomNav, Hero, NAV_SPACE, Sticker, Tile, TileHead } from '@/components/Bento';
import { Button } from '@/components/Button';
import { Appear, Pressy, SlideUp, stagger } from '@/components/Motion';
import { Text } from '@/components/Text';
import { FRAME_CARD, FRAMES, RARITY } from '@/lib/cosmetics';
import { errorInfo } from '@/lib/game';
import { useScreenInsets } from '@/lib/screenInsets';
import { useMe } from '@/lib/useMe';
import { colors, fonts } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

type Item = { id: string; name: string; price: string | null; isNew: boolean; owned: boolean; equipped: boolean };

// 20.2 Loja: destaque inclinado, atalhos "Minhas" e "Em breve" e as molduras
// em cartões coloridos. Só visual: ninguém compra vantagem.
export default function Loja() {
  const shop = useQuery(api.cosmetics.shop, {});
  const me = useMe();
  const insets = useScreenInsets();
  const [open, setOpen] = useState<Item | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [soon, setSoon] = useState(false);

  const items: Item[] = shop?.items ?? [];
  const owned = items.filter((i) => i.owned).length;
  // Destaque: a mais rara que a pessoa ainda não tem (ou a mais rara de todas).
  const order = ['lendaria', 'epica', 'rara', 'comum'];
  const byRarity = [...items].sort((a, b) => order.indexOf(FRAME_CARD[a.id]?.rarity) - order.indexOf(FRAME_CARD[b.id]?.rarity));
  const featured = byRarity.find((i) => !i.owned) ?? byRarity[0];
  const shown = onlyMine ? items.filter((i) => i.owned) : items;

  return (
    <View style={{ flex: 1, backgroundColor: BENTO.ink }}>
      <BentoBackground glow="rgba(255,194,61,0.16)" />
      <ScrollView
        contentContainerStyle={{ paddingTop: Math.max(insets.top, 20) + 14, paddingHorizontal: 16, paddingBottom: NAV_SPACE + Math.max(insets.bottom, 12) }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.title}>
            Loja<Text style={[styles.title, { color: colors.lime }]}>.</Text>
          </Text>
          <View style={styles.count}>
            <LinearGradient colors={FRAMES.ouro.colors} style={{ width: 24, height: 24, borderRadius: 12 }} />
            <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong }}>{`${owned}/${items.length || 5}`}</Text>
          </View>
        </View>

        {featured ? (
          <Appear>
            <Pressable onPress={() => setOpen(featured)} accessibilityRole="button" accessibilityLabel={`Destaque: moldura ${featured.name}`}>
              <Hero
                from={FRAME_CARD[featured.id]?.from ?? '#FFE27A'}
                to={FRAME_CARD[featured.id]?.to ?? '#FFB020'}
                sticker={
                  <View style={{ position: 'absolute', right: 16, top: 24, transform: [{ rotate: '-3deg' }] }} pointerEvents="none">
                    <Avatar name={me.name || '?'} size={124} frame={featured.id} />
                  </View>
                }>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={styles.rarityDark}>
                    <Text style={[styles.rarityText, { color: RARITY[FRAME_CARD[featured.id]?.rarity ?? 'comum'].color }]}>
                      ◆ {RARITY[FRAME_CARD[featured.id]?.rarity ?? 'comum'].name}
                    </Text>
                  </View>
                  {featured.isNew ? (
                    <View style={[styles.rarityDark, { backgroundColor: 'rgba(11,15,19,0.18)' }]}>
                      <Text style={[styles.rarityText, { color: BENTO.ink }]}>NOVA</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.heroTitle}>{featured.name}</Text>
                <Text style={styles.heroBody} numberOfLines={2}>
                  {FRAMES[featured.id]?.preview}
                </Text>
                <View style={{ position: 'absolute', left: 18, bottom: 16 }}>
                  <ArrowPill label={featured.owned ? (featured.equipped ? 'Usando' : 'Equipar') : (featured.price ?? 'Grátis')} onPress={() => setOpen(featured)} />
                </View>
              </Hero>
            </Pressable>
          </Appear>
        ) : null}

        <Appear delay={80} style={styles.row}>
          <Tile onPress={() => setOnlyMine((v) => !v)} style={[{ flex: 1, padding: 12 }, onlyMine && { borderColor: colors.lime }]}>
            <View style={styles.inline}>
              <Sticker kind="bag" color={colors.pink} size={40} tilt={-8} />
              <TileHead title="Minhas" sub={`${owned} ${owned === 1 ? 'moldura' : 'molduras'}`} />
            </View>
          </Tile>
          <Tile onPress={() => setSoon((v) => !v)} style={{ flex: 1, padding: 12 }}>
            <View style={styles.inline}>
              <Sticker kind="ghost" color="#B57CFF" size={40} tilt={8} />
              <TileHead title="Em breve" sub={soon ? 'rastros e sons' : 'rastros e sons'} subColor="#B57CFF" />
            </View>
          </Tile>
        </Appear>
        {soon ? (
          <Text style={[styles.small, { marginTop: 8 }]}>Rastro no mapa do fim da rodada e som do grito chegam nas próximas versões.</Text>
        ) : null}

        <View style={styles.sectionHead}>
          <Text style={styles.section}>{onlyMine ? 'Minhas molduras' : 'Molduras'}</Text>
          <Text style={styles.small}>{onlyMine ? 'toque para ver todas' : `${items.length} no total`}</Text>
        </View>
        <View style={styles.grid}>
          {shown.map((i, k) => (
            <Appear key={i.id} delay={stagger(k, 60)} style={styles.cell}>
              <ColorCard item={i} tilt={[-3, 2.5, 2, -2.5][k % 4]} name={me.name || '?'} onPress={() => setOpen(i)} />
            </Appear>
          ))}
        </View>
      </ScrollView>
      <BottomNav />
      {open ? <ItemSheet item={items.find((i) => i.id === open.id) ?? open} name={me.name || '?'} onClose={() => setOpen(null)} /> : null}
    </View>
  );
}

// Cartão colorido da moldura (o degradê é a cor dela), levemente girado.
function ColorCard({ item, tilt, name, onPress }: { item: Item; tilt: number; name: string; onPress: () => void }) {
  const c = FRAME_CARD[item.id] ?? { rarity: 'comum', from: '#333', to: '#222' };
  const r = RARITY[c.rarity];
  const label = item.equipped ? 'Usando' : item.owned ? 'Sua' : (item.price ?? 'Grátis');
  return (
    <Pressy onPress={onPress} scaleTo={0.95} accessibilityRole="button" accessibilityLabel={`Moldura ${item.name}, ${label}`} style={{ height: 178 }}>
      <View style={[StyleSheet.absoluteFill, styles.cardShadow, { transform: [{ rotate: `${tilt}deg` }, { translateX: 3 }, { translateY: 6 }] }]} />
      <View style={[StyleSheet.absoluteFill, styles.card, { transform: [{ rotate: `${tilt}deg` }] }]}>
        <LinearGradient colors={[c.from, c.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.cardBlob} />
        <View style={[styles.rarityDark, { position: 'absolute', left: 12, top: 12 }]}>
          <Text style={[styles.rarityText, { color: r.color }]}>◆ {r.name}</Text>
        </View>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 38, alignItems: 'center' }}>
          <Avatar name={name} size={70} frame={item.id} />
        </View>
        <View style={styles.cardFoot}>
          <Text style={styles.cardName}>{item.name}</Text>
          <View style={[styles.price, !item.owned && item.price ? { backgroundColor: BENTO.ink } : null]}>
            <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: !item.owned && item.price ? colors.paper : BENTO.ink }}>{label}</Text>
          </View>
        </View>
      </View>
    </Pressy>
  );
}

// O item aberto: prévia grande, onde a crew vê, comprar (no beta, de graça) ou equipar.
function ItemSheet({ item, name, onClose }: { item: Item; name: string; onClose: () => void }) {
  const equip = useMutation(api.cosmetics.equip);
  const buy = useMutation(api.cosmetics.buy);
  const insets = useScreenInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = FRAME_CARD[item.id] ?? { rarity: 'comum', from: '#333', to: '#222' };
  const r = RARITY[c.rarity];
  const act = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!item.owned) await buy({ itemId: item.id });
      else await equip({ itemId: item.equipped ? null : item.id });
    } catch (e) {
      setError(errorInfo(e).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={onClose} />
        <SlideUp>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
            <View style={styles.preview}>
              <LinearGradient colors={[c.from, c.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Avatar name={name} size={140} frame={item.id} />
            </View>
            <Text style={[styles.rarityText, { color: r.color, marginTop: 16 }]}>◆ {r.name} · MOLDURA</Text>
            <Text style={styles.sheetTitle}>{item.name}</Text>
            <Text style={[styles.small, { fontSize: 14, lineHeight: 20, marginTop: 6 }]}>
              {FRAMES[item.id]?.preview} A crew inteira vê no lobby, na roleta, no mapa e no Radio. Só visual: não muda o jogo.
            </Text>
            <View style={styles.where}>
              {[
                ['mapa', 44],
                ['lobby', 36],
                ['Radio', 28],
              ].map(([l, s]) => (
                <View key={l as string} style={{ alignItems: 'center', gap: 6 }}>
                  <View style={{ height: 48, justifyContent: 'center' }}>
                    <Avatar name={name} size={s as number} frame={item.id} />
                  </View>
                  <Text style={styles.small}>{l}</Text>
                </View>
              ))}
            </View>
            {error ? (
              <Text variant="error" style={{ marginTop: 8 }}>
                {error}
              </Text>
            ) : null}
            <Button
              label={!item.owned ? `Comprar · ${item.price ?? 'Grátis'}` : item.equipped ? 'Tirar a moldura' : 'Equipar'}
              variant={item.equipped ? 'secondary' : 'primary'}
              loading={busy}
              onPress={act}
              style={{ marginTop: 16 }}
            />
            {!item.owned ? <Text style={[styles.small, { textAlign: 'center', marginTop: 8 }]}>No beta é de graça: nada é cobrado.</Text> : null}
            <Button label="Fechar" variant="link" onPress={onClose} />
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.paper },
  count: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BENTO.tile, borderWidth: 1, borderColor: BENTO.line, borderRadius: 999, paddingVertical: 6, paddingLeft: 6, paddingRight: 12 },
  heroTitle: { fontFamily: fonts.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.6, color: BENTO.ink, marginTop: 12 },
  heroBody: { fontSize: 13, fontFamily: fonts.bodyStrong, color: BENTO.ink, opacity: 0.75, marginTop: 4, width: 150 },
  rarityDark: { backgroundColor: BENTO.ink, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  rarityText: { fontSize: 10, fontFamily: fonts.bodyStrong, letterSpacing: 0.8 },
  row: { flexDirection: 'row', gap: 10, marginTop: 20 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 20 },
  section: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4, color: colors.paper },
  small: { fontSize: 12, color: BENTO.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16, marginTop: 12 },
  cell: { width: '48%' },
  card: { borderRadius: 24, overflow: 'hidden' },
  cardShadow: { borderRadius: 24, backgroundColor: BENTO.ink, opacity: 0.55 },
  cardBlob: { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.2)' },
  cardFoot: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: BENTO.ink },
  price: { backgroundColor: 'rgba(11,15,19,0.15)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 9 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: BENTO.tile, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: BENTO.line, padding: 20 },
  preview: { height: 220, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -1.2, color: colors.paper, marginTop: 4 },
  where: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, backgroundColor: BENTO.ink, borderRadius: 18, paddingVertical: 12 },
});
