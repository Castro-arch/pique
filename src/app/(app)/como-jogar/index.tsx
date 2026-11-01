import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';

import { BENTO, Sticker, type StickerKind } from '@/components/Bento';
import { Button } from '@/components/Button';
import { Appear } from '@/components/Motion';
import { OutlinedText } from '@/components/OutlinedText';
import { Text } from '@/components/Text';
import { TutorialMap } from '@/components/TutorialMap';
import type { TutorialMover } from '@/components/tutorialMapTypes';
import { NARRATION } from '@/lib/narration';
import { useScreenInsets } from '@/lib/screenInsets';
import { TUTORIAL_CENTER, TUTORIAL_ROUTES, type LngLat, type Who } from '@/lib/tutorialRoutes';
import { colors, fonts } from '@/theme/tokens';

// Antes do Como jogar: uma tela que avisa que o tutorial vai começar (depois do
// cadastro e das permissões). No fundo, o mapa de verdade com a crew se
// espalhando pelas ruas e o caçador indo atrás, em loop. O toque em "Começar"
// também destrava o som da narração no iPhone.
const MINUTES = Math.round(NARRATION.reduce((t, n) => t + n.ms, 0) / 60000);
const LOOP_MS = 5600;

export default function ComecarTutorial() {
  const insets = useScreenInsets();
  const { de } = useLocalSearchParams<{ de?: string }>();
  const lap = useLap();

  // ida: todo mundo sai do meio (passo 3 do tutorial); volta: o caminho ao contrário
  const out = lap % 2 === 0;
  const movers: TutorialMover[] = (['P', 'T', 'S', 'C', 'L'] as Who[]).map((who) => {
    const base: LngLat[] = who === 'L' ? TUTORIAL_ROUTES[3].L : TUTORIAL_ROUTES[2][who];
    const route = out ? base : [...base].reverse();
    return { id: who, route, runKey: `${who}-${lap}`, delay: who === 'L' ? 700 : 0, zIndex: who === 'L' ? 5 : 2, node: <Dot who={who} /> };
  });

  const start = () => router.replace({ pathname: '/como-jogar/[passo]', params: { passo: '1', ...(de ? { de } : {}) } });
  const skip = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={{ flex: 1, backgroundColor: BENTO.ink }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top, 20) + 14, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
        <Appear style={styles.mapCard}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <TutorialMap camera={{ center: [TUTORIAL_CENTER.lng, TUTORIAL_CENTER.lat], zoom: 16.2, instant: true }} padding={{ top: 0, bottom: 0, left: 0, right: 0 }} zoneRadius={170} movers={movers} marks={[]} />
          </View>
          <View pointerEvents="none" style={styles.mapFade} />
          <Bob style={{ position: 'absolute', left: 16, top: 16 }} delay={0}>
            <Sticker kind="radar" color="#5AC8FA" size={52} tilt={-12} edge={colors.paper} />
          </Bob>
          <Bob style={{ position: 'absolute', right: 18, top: 22 }} delay={500}>
            <Sticker kind="shield" color="#B57CFF" size={44} tilt={10} edge={colors.paper} />
          </Bob>
          <Bob style={{ position: 'absolute', right: 26, bottom: 18 }} delay={250}>
            <Sticker kind="hand" color={colors.pink} size={62} tilt={-14} edge={colors.paper} />
          </Bob>
          <View style={styles.live}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.pink }} />
            <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: colors.paper, letterSpacing: 0.6 }}>UMA PARTIDA DE VERDADE</Text>
          </View>
        </Appear>

        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 18 }}>
          <Appear delay={80} style={{ alignItems: 'center' }}>
            <OutlinedText text="Bora pro" size={50} label="Bora pro tutorial" />
            <View style={{ marginTop: -6 }}>
              <OutlinedText text="tutorial" size={50} dot={colors.lime} label="" />
            </View>
            <Text style={styles.sub}>Antes da primeira partida, a gente te mostra no mapa como fugir, como caçar e pra que serve cada boost.</Text>
          </Appear>

          <Appear delay={140} style={styles.pills}>
            <Pill sticker="radar" color="#5AC8FA" label={`${MINUTES} min`} />
            <Pill sticker="mega" color="#FFC23D" label="Com narração" />
            <Pill sticker="run" color={colors.lime} label="Até 2x" />
          </Appear>
        </View>

        <Appear delay={200} style={{ gap: 6 }}>
          <Button label="Começar tutorial" onPress={start} style={{ minHeight: 60, borderRadius: 24 }} />
          <Text onPress={skip} style={styles.skip}>
            Pular, já sei jogar
          </Text>
        </Appear>
      </ScrollView>
    </View>
  );
}

// Quantas voltas a animação do mapa já deu.
function useLap() {
  const [lap, setLap] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLap((n) => n + 1), LOOP_MS);
    return () => clearInterval(t);
  }, []);
  return lap;
}

// Uma pessoa no mapa, igual ao tutorial: corredores verdes, você com anel, o caçador escuro com borda rosa.
function Dot({ who }: { who: Who }) {
  const hunter = who === 'L';
  const me = who === 'C';
  const size = me ? 26 : 22;
  const look = hunter
    ? { backgroundColor: BENTO.ink, borderColor: colors.pink }
    : me
      ? { backgroundColor: colors.lime, borderColor: colors.paper, boxShadow: '0 0 0 5px rgba(200,242,60,0.28)' }
      : { backgroundColor: colors.lime, borderColor: BENTO.ink };
  return (
    <View style={{ width: 0, height: 0 }}>
      <View style={[{ position: 'absolute', left: -size / 2, top: -size / 2, width: size, height: size, borderRadius: size / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center' }, look]}>
        <Text style={{ fontFamily: fonts.display, fontSize: 11, color: hunter ? colors.paper : BENTO.ink }}>{who}</Text>
      </View>
    </View>
  );
}

// Figurinha que flutua devagar.
function Bob({ children, style, delay }: { children: React.ReactNode; style: object; delay: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);
  return <Animated.View style={[style, { transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }] }]}>{children}</Animated.View>;
}

function Pill({ sticker, color, label }: { sticker: StickerKind; color: string; label: string }) {
  return (
    <View style={styles.pill}>
      <Sticker kind={sticker} color={color} size={26} tilt={-8} edge={colors.paper} />
      <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.paper }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: { height: 300, borderRadius: 28, borderWidth: 2, borderColor: colors.lime, backgroundColor: BENTO.tile, overflow: 'hidden' },
  mapFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, backgroundImage: 'linear-gradient(rgba(11,15,19,0), rgba(11,15,19,0.55))' } as object,
  live: { position: 'absolute', left: 14, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(11,15,19,0.82)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  sub: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: '#C9C7BF', marginTop: 12, textAlign: 'center' },
  pills: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BENTO.tile, borderWidth: 1, borderColor: BENTO.line, borderRadius: 999, paddingVertical: 6, paddingLeft: 8, paddingRight: 12 },
  skip: { textAlign: 'center', fontSize: 14, fontFamily: fonts.bodyStrong, color: BENTO.muted, paddingVertical: 8 },
});
