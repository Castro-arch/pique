import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { Info, Volume2 } from '@/components/icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, Vibration, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { mmss } from '@/components/Game';
import { secondsUntil, useNow, useView } from '@/lib/game';
import { useScreenInsets } from '@/lib/screenInsets';
import { playShout, SHOUT_SOUND, stopShout } from '@/lib/shoutSound';
import { colors, fonts, radius } from '@/theme/tokens';

// 10.6 Um caçador gritou e meu celular está tocando. O som (e a vibração) fica
// repetindo até o corredor tocar em Voltar ao mapa; toca mesmo no silencioso.
// No site o som sai pelo <audio> destravado no primeiro toque (lib/shoutSound).
export default function Grito() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const view = useView(id);
  const now = useNow();
  const insets = useScreenInsets();
  const player = useAudioPlayer(SHOUT_SOUND);
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const web = playShout();
    if (!web) {
      (async () => {
        await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
        player.volume = 1;
        player.loop = true;
        player.seekTo(0);
        player.play();
      })();
    }
    // A vibração repete junto até sair da tela.
    let buzz: ReturnType<typeof setInterval> | null = null;
    if (Platform.OS !== 'web') Vibration.vibrate([0, 400, 150, 400, 150, 400, 600], true);
    else if ('vibrate' in navigator) {
      navigator.vibrate([400, 150, 400, 150, 400]);
      buzz = setInterval(() => navigator.vibrate([400, 150, 400, 150, 400]), 2100);
    }
    // Os anéis saem do alto-falante sem parar, no ritmo do som.
    const loop = Animated.loop(Animated.timing(wave, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => {
      loop.stop();
      if (buzz) clearInterval(buzz);
      if (Platform.OS !== 'web') Vibration.cancel();
      else if ('vibrate' in navigator) navigator.vibrate(0);
      stopShout();
      try {
        player.pause();
      } catch {}
    };
  }, [player, wave]);

  const stop = () => {
    stopShout();
    try {
      player.loop = false;
      player.pause();
    } catch {}
    if (Platform.OS !== 'web') Vibration.cancel();
    router.back();
  };

  const left = view ? secondsUntil(view.game.endsAt, now) : 0;
  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 20) + 16, paddingBottom: Math.max(insets.bottom, 20) + 14 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={styles.chip}>
          <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong }}>{view ? `${view.game.code} · ${mmss(left)}` : 'Pique'}</Text>
        </View>
        <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.pinkInk }}>você corre</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Alto-falante com os anéis: ocupa o espaço que sobrar, sem passar por cima do texto. */}
        <View aria-hidden pointerEvents="none" style={styles.rings}>
          {[0, 0.5].map((d) => (
            <Animated.View
              key={d}
              style={[
                styles.ring,
                {
                  opacity: wave.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                  transform: [{ scale: Animated.modulo(Animated.add(wave, d), 1).interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }],
                },
              ]}
            />
          ))}
          <View style={styles.speaker}>
            <Volume2 size={46} color={colors.pink} strokeWidth={2} />
          </View>
        </View>

        <Text accessibilityRole="alert" numberOfLines={2} adjustsFontSizeToFit style={styles.title}>
          Seu celular gritou<Text style={[styles.title, { color: colors.paper }]}>.</Text>
        </Text>
        <Text style={styles.body}>Um caçador está a menos de 60 m e agora sabe para onde olhar. Saia daí ou fique bem quieto.</Text>
        <View style={styles.tip}>
          <Info size={18} color={colors.pinkInk} strokeWidth={2.2} />
          <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, fontFamily: fonts.bodyStrong, color: colors.pinkInk }}>
            O som fica tocando até você voltar ao mapa, mesmo no silencioso. Deixe o volume baixo, não desligado.
          </Text>
        </View>
      </ScrollView>
      <Button variant="dark" size="lg" label="Voltar ao mapa" onPress={stop} style={{ marginTop: 16, backgroundColor: colors.pinkInk }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pink, paddingHorizontal: 20 },
  rings: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ring: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 3, borderColor: colors.pinkInk },
  speaker: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.pinkInk, alignItems: 'center', justifyContent: 'center' },
  chip: { backgroundColor: colors.pinkInk, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  title: { fontFamily: fonts.display, fontSize: 58, lineHeight: 56, letterSpacing: -3, color: colors.pinkInk },
  body: { marginTop: 12, fontSize: 17, lineHeight: 24, fontFamily: fonts.bodyMedium, color: colors.pinkInk },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 14, backgroundColor: 'rgba(42,6,16,0.12)', borderRadius: radius.md, padding: 12 },
});
