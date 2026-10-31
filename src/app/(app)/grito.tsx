import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { Info, Volume2 } from '@/components/icons';
import { useEffect } from 'react';
import { Platform, StyleSheet, Vibration, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { mmss } from '@/components/Game';
import { secondsUntil, useNow, useView } from '@/lib/game';
import { colors, fonts, radius } from '@/theme/tokens';

const SOUND = require('../../../assets/sounds/grito.wav');

// 10.6 Um caçador gritou e meu celular está tocando. O som dura 2 s e toca
// mesmo no silencioso; o caçador escuta e vem atrás.
export default function Grito() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const view = useView(id);
  const now = useNow();
  const player = useAudioPlayer(SOUND);

  useEffect(() => {
    (async () => {
      await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
      player.volume = 1;
      player.seekTo(0);
      player.play();
    })();
    if (Platform.OS !== 'web') Vibration.vibrate([0, 400, 150, 400, 150, 400]);
    else if ('vibrate' in navigator) navigator.vibrate([400, 150, 400, 150, 400]);
  }, [player]);

  const left = view ? secondsUntil(view.game.endsAt, now) : 0;
  return (
    <View style={styles.root}>
      <View aria-hidden pointerEvents="none" style={styles.rings}>
        {[340, 240, 140].map((d, i) => (
          <View key={d} style={[styles.ring, { width: d, height: d, borderRadius: d / 2, opacity: [0.1, 0.2, 0.35][i] }]} />
        ))}
        <View style={styles.speaker}>
          <Volume2 size={56} color={colors.pink} strokeWidth={2} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={styles.chip}>
          <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong }}>{view ? `${view.game.code} · ${mmss(left)}` : 'Pique'}</Text>
        </View>
        <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.pinkInk }}>você corre</Text>
      </View>

      <View style={{ flex: 1 }} />

      <Text accessibilityRole="alert" style={styles.title}>
        Seu celular gritou<Text style={[styles.title, { color: colors.paper }]}>.</Text>
      </Text>
      <Text style={styles.body}>Um caçador está a menos de 60 m e agora sabe para onde olhar. Saia daí ou fique bem quieto.</Text>
      <View style={styles.tip}>
        <Info size={18} color={colors.pinkInk} strokeWidth={2.2} />
        <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, fontFamily: fonts.bodyStrong, color: colors.pinkInk }}>
          O som toca mesmo no silencioso. Deixe o volume baixo, não desligado.
        </Text>
      </View>
      <Button variant="dark" size="lg" label="Voltar ao mapa" onPress={() => router.back()} style={{ marginTop: 18, backgroundColor: colors.pinkInk }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pink, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 34 },
  rings: { position: 'absolute', left: 0, right: 0, top: 52, height: 390, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 3, borderColor: colors.pinkInk },
  speaker: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.pinkInk, alignItems: 'center', justifyContent: 'center' },
  chip: { backgroundColor: colors.pinkInk, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  title: { fontFamily: fonts.display, fontSize: 64, lineHeight: 59, letterSpacing: -3.5, color: colors.pinkInk },
  body: { marginTop: 14, fontSize: 17, lineHeight: 24, fontFamily: fonts.bodyMedium, color: colors.pinkInk },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 16, backgroundColor: 'rgba(42,6,16,0.12)', borderRadius: radius.md, padding: 12 },
});
