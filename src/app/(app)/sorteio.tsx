import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Chip } from '@/components/Chip';
import { Logo } from '@/components/Nav';
import { Screen } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { match } from '@/lib/demo';
import { colors, fonts } from '@/theme/tokens';

// 5.8 Sorteio: a tela inteira é o botão. Cada um vê o papel no próprio celular.
export default function Sorteio() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const reveal = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace({ pathname: '/papel', params: { papel: 'runner' } });
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Toque para descobrir seu papel" onPress={reveal} style={{ flex: 1 }}>
      <Screen>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo size={22} />
          <Chip label={`${match.code} · Rodada ${match.round}`} style={{ paddingVertical: 8, paddingHorizontal: 14 }} />
        </View>
        <View style={styles.center}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.center,
              { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) }] },
            ]}>
            <Svg width={320} height={320} viewBox="0 0 320 320">
              <Circle cx={160} cy={160} r={150} stroke={colors.lime} strokeWidth={2} fill="none" />
            </Svg>
          </Animated.View>
          <Svg width={320} height={320} viewBox="0 0 320 320" style={StyleSheet.absoluteFill as never}>
            <Circle cx={160} cy={160} r={120} stroke={colors.inkBorder} strokeWidth={1.5} strokeDasharray="4 10" fill="none" />
          </Svg>
          <Text style={{ fontFamily: fonts.display, fontSize: 300, lineHeight: 310, color: colors.lime }}>?</Text>
        </View>
        <Text variant="muted">Sem espiar o celular dos amigos.</Text>
        <Headline variant="h2" style={{ marginTop: 6, fontSize: 34, lineHeight: 36 }}>Toque para descobrir</Headline>
      </Screen>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
