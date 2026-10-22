import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { useCountdown } from '@/components/Game';
import { Headline, Text } from '@/components/Text';
import { Sheet } from '@/components/Sheet';
import { photos } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

// 6.9 Caçador marcou um corredor e espera ele confirmar no celular.
// Sem resposta em 60 s, conta como pego (regra do documento).
export default function Confirmando() {
  const left = useCountdown(42);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);

  // Demonstração: em 4 s a Priya "contesta", para mostrar a próxima tela.
  useEffect(() => {
    const t = setTimeout(() => router.replace('/contestado'), 4000);
    return () => clearTimeout(t);
  }, []);

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
          <Avatar source={photos.priya} size={72} state="runner" label="Priya" />
        </View>
        <Headline variant="h2" style={{ textAlign: 'center', marginTop: 18 }}>Esperando a Priya confirmar</Headline>
        <Text variant="muted" style={{ textAlign: 'center', marginTop: 8 }}>
          Ela recebeu um aviso no celular. Fique por perto até ela responder.
        </Text>
        <View style={styles.timer} accessibilityLiveRegion="polite">
          <Text variant="small" style={{ textAlign: 'center' }}>
            Se ninguém responder em <Text style={{ fontFamily: fonts.bodyStrong, color: colors.paper, fontSize: 13 }}>0:{String(left).padStart(2, '0')}</Text>, conta como pego.
          </Text>
        </View>
        <Button variant="secondary" label="Cancelar, me enganei" style={{ marginTop: 16, backgroundColor: colors.ink }} onPress={() => router.back()} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  timer: { marginTop: 16, backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14 },
});
