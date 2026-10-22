import { useMutation } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { useCountdown } from '@/components/Game';
import { Headline, Text } from '@/components/Text';
import { Sheet } from '@/components/Sheet';
import { photos } from '@/lib/demo';
import { secondsUntil, useNow, useView } from '@/lib/game';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

// 6.9 Caçador marcou um corredor e espera ele confirmar no celular.
// Sem resposta em 60 s, conta como pego (regra do documento).
export default function Confirmando() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const view = useView(id);
  const cancel = useMutation(api.play.cancelCapture);
  const now = useNow();
  const demoLeft = useCountdown(42);
  const capture = view?.capture ?? null;
  const left = id ? secondsUntil(capture?.expiresAt, now) : demoLeft;
  const runner = id ? (capture?.other ?? '…') : 'Priya';
  const spin = useRef(new Animated.Value(0)).current;

  // Partida real: quando a pega sai de "pendente", ou foi confirmada
  // (volta para o mapa) ou contestada (mostra a contestação).
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!id || !view) return;
    if (capture) return setSeen(true);
    if (!seen) return;
    if (view.disputed) router.replace({ pathname: '/contestado', params: { id } });
    else router.back();
  }, [id, view, capture, seen]);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);

  // Demonstração: em 4 s a Priya "contesta", para mostrar a próxima tela.
  useEffect(() => {
    if (id) return;
    const t = setTimeout(() => router.replace('/contestado'), 4000);
    return () => clearTimeout(t);
  }, [id]);

  return (
    <View style={{ flex: 1 }}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <Sheet>
        <View style={{ alignItems: 'center', marginTop: 22, height: 96, justifyContent: 'center' }}>
          <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
            <Svg width={96} height={96} viewBox="0 0 96 96">
              <Circle cx={48} cy={48} r={44} stroke={colors.inkBorder} strokeWidth={4} fill="none" />
              <Circle cx={48} cy={48} r={44} stroke={colors.lime} strokeWidth={4} fill="none" strokeDasharray="60 220" strokeLinecap="round" />
            </Svg>
          </Animated.View>
          <Avatar source={id ? undefined : photos.priya} name={runner} size={72} state="runner" label={runner} />
        </View>
        <Headline variant="h2" style={{ textAlign: 'center', marginTop: 18 }}>{`Esperando ${runner} confirmar`}</Headline>
        <Text variant="muted" style={{ textAlign: 'center', marginTop: 8 }}>
          Chegou um aviso no celular. Fique por perto até a resposta.
        </Text>
        <View style={styles.timer} accessibilityLiveRegion="polite">
          <Text variant="small" style={{ textAlign: 'center' }}>
            Se ninguém responder em <Text style={{ fontFamily: fonts.bodyStrong, color: colors.paper, fontSize: 13 }}>0:{String(left).padStart(2, '0')}</Text>, conta como pego.
          </Text>
        </View>
        <Button variant="secondary" label="Cancelar, me enganei" style={{ marginTop: 16, backgroundColor: colors.ink }}
          onPress={async () => {
            if (capture) await cancel({ captureId: capture.id });
            router.back();
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  timer: { marginTop: 16, backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14 },
});
