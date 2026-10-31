import { useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Hand } from '@/components/icons';
import { PopIn, SlideUp } from '@/components/Motion';
import { Text } from '@/components/Text';
import { photos } from '@/lib/demo';
import { useView, type GameId } from '@/lib/game';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

// 8.1 "Um caçador te achou?": o caçador marcou e o corredor confirma.
// 17.4 "Te pegaram?": o corredor tocou em "Fui pego" e diz quem pegou.
export default function Pego() {
  const { id, captura } = useLocalSearchParams<{ id?: string; captura?: string }>();
  return captura || !id ? <Claimed id={id} captura={captura} /> : <SelfReport id={id} />;
}

function Claimed({ id, captura }: { id?: string; captura?: string }) {
  const view = useView(id);
  const answer = useMutation(api.play.answerCapture);
  const hunterName = captura ? view?.capture?.other : undefined;

  const yes = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    if (!id) return router.replace('/achado');
    if (captura) await answer({ captureId: captura as Id<'captures'>, caught: true });
    router.back();
  };
  const no = async () => {
    if (id && captura) await answer({ captureId: captura as Id<'captures'>, caught: false });
    router.back();
  };
  return (
    <View style={styles.root}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <PopIn>
      <View accessibilityRole="alert" accessibilityViewIsModal style={styles.dialog}>
        {id ? (
          <Avatar name={hunterName ?? '?'} size={64} state="hunter" label={hunterName ? `${hunterName}, caçador` : 'Caçador'} />
        ) : (
          <Avatar source={photos.leo} size={64} state="hunter" label="Leo, caçador" />
        )}
        <Text style={styles.title}>{hunterName ? `${hunterName} disse que te pegou` : 'Um caçador te achou?'}</Text>
        <Text variant="muted" style={{ textAlign: 'center', marginTop: 8 }}>
          Você sai da rodada e sua localização para de ser compartilhada. A crew te espera no fim.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20, alignSelf: 'stretch' }}>
          <Button variant="secondary" label={captura ? 'Não pegou' : 'Ainda não'} style={{ flex: 1, backgroundColor: colors.ink }} onPress={no} />
          <Button variant="danger" label="Sim, me acharam" style={{ flex: 1.3 }} onPress={yes} />
        </View>
      </View>
      </PopIn>
    </View>
  );
}

function SelfReport({ id }: { id: string }) {
  const view = useView(id);
  const report = useMutation(api.play.reportCaught);
  const insets = useScreenInsets();
  const hunters = view?.hunters ?? [];
  const [who, setWho] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // Com um caçador só, ele já vem escolhido.
  useEffect(() => {
    if (!who && hunters.length === 1) setWho(hunters[0].id);
  }, [hunters, who]);
  const chosen = hunters.find((h) => h.id === who);

  const yes = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    setSending(true);
    try {
      await report({ gameId: id as GameId, hunterId: chosen ? (chosen.id as Id<'players'>) : undefined });
      router.back();
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.root, { justifyContent: 'flex-end', padding: 0 }]}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <SlideUp>
      <View accessibilityRole="alert" accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 14 }]}>
        <View style={styles.grip} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <Hand size={26} color={colors.pink} strokeWidth={2.2} />
          <Text style={styles.sheetTitle}>Te pegaram?</Text>
        </View>
        <Text variant="muted" style={{ marginTop: 8 }}>
          Sistema de honra: só confirme se um caçador encostou em você de verdade. Você sai do mapa e passa a assistir.
        </Text>
        {hunters.length ? (
          <>
            <Text variant="label" style={{ marginTop: 14 }}>
              Quem te pegou?
            </Text>
            <View accessibilityRole="radiogroup" style={styles.hunters}>
              {hunters.map((h) => {
                const on = h.id === who;
                return (
                  <Pressable
                    key={h.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => setWho(on ? null : h.id)}
                    style={[styles.hunter, on && { backgroundColor: colors.pinkTint, borderColor: colors.pink, borderWidth: 2 }]}>
                    <Avatar name={h.name} size={28} state="hunter" />
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontFamily: fonts.bodyStrong }}>
                      {h.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
        <Button variant="danger" label={chosen ? `Sim, o ${chosen.name} me pegou` : 'Sim, fui pego'} loading={sending} style={{ marginTop: 16 }} onPress={yes} />
        <Button variant="link" label="Não, voltar" style={{ marginTop: 6 }} onPress={() => router.back()} />
      </View>
      </SlideUp>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  dialog: {
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.xxl,
    padding: 22,
    alignItems: 'center',
  },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 32, letterSpacing: -1, textAlign: 'center', marginTop: 16, color: colors.paper },
  sheet: {
    backgroundColor: colors.inkRaised,
    borderTopWidth: 1,
    borderColor: colors.inkBorder,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 14,
    paddingHorizontal: 20,
  },
  grip: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.inkBorder },
  sheetTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 32, letterSpacing: -1 },
  hunters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  hunter: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.md,
    padding: 10,
  },
});
