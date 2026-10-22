import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

// 9.2 Carregando: o GPS procurando você antes do mapa.
export default function Carregando() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    const t = setTimeout(() => router.replace({ pathname: '/jogo', params: { estado: 'corredor-vantagem' } }), 3500);
    return () => {
      loop.stop();
      clearTimeout(t);
    };
  }, [pulse]);

  return (
    <View style={styles.root} aria-busy>
      <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
            },
          ]}>
          <Svg width={200} height={200}>
            <Circle cx={100} cy={100} r={96} stroke={colors.lime} strokeWidth={2} fill={colors.lime} fillOpacity={0.08} />
          </Svg>
        </Animated.View>
        <View style={styles.dot} />
      </View>
      <Text accessibilityRole="text" accessibilityLiveRegion="polite" style={{ fontFamily: fonts.display, fontSize: 24, marginTop: 24 }}>
        Achando você no mapa…
      </Text>
      <Text variant="muted" style={{ marginTop: 6 }}>Ao ar livre o GPS pega mais rápido.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: 20 },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.lime, borderWidth: 4, borderColor: colors.limeInk },
});
