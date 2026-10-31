import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

const MARK = require('../../assets/images/logo-mark.png');

// Tela de carregamento: a logo soltando anéis, como um ping. Sem texto,
// para não depender das fontes. No site, o public/index.html mostra a mesma
// tela antes do JavaScript chegar; esta assume depois, sem piscar.
export function Loading() {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      const ping = (v: Animated.Value) =>
        Animated.loop(Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.bezier(0.2, 0.6, 0.4, 1), useNativeDriver: true }));
      loops = [ping(a), Animated.sequence([Animated.delay(800), ping(b)])];
      loops.forEach((l) => l.start());
    });
    return () => loops.forEach((l) => l.stop());
  }, [a, b]);

  const ring = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) }],
  });

  return (
    <View style={styles.root} role="progressbar" aria-label="Carregando o Pique">
      <View style={styles.mark}>
        <Animated.View style={[styles.ring, ring(a)]} />
        <Animated.View style={[styles.ring, ring(b)]} />
        <Image source={MARK} style={styles.logo} accessibilityIgnoresInvertColors />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: colors.lime, backgroundColor: 'rgba(200,242,60,0.08)' },
  logo: { width: 96, height: 96 },
});
