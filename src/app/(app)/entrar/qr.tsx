import { router } from 'expo-router';
import { ChevronLeft, Flashlight } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

// 4.4 Escanear QR do lobby. A câmera de verdade (expo-camera) entra junto
// com o jogo no servidor; por ora a moldura e a linha de leitura animada.
export default function EscanearQR() {
  const [torch, setTorch] = useState(false);
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y]);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.pill}>
          <ChevronLeft size={20} color={colors.paper} strokeWidth={2.4} />
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15 }}>Voltar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Lanterna"
          accessibilityState={{ checked: torch }}
          onPress={() => setTorch(!torch)}
          style={[styles.round, torch && { backgroundColor: colors.lime }]}>
          <Flashlight size={20} color={torch ? colors.limeInk : colors.paper} />
        </Pressable>
      </View>

      <Text accessibilityRole="header" style={styles.title}>
        Aponte para o QR do anfitrião<Text style={[styles.title, { color: colors.lime }]}>.</Text>
      </Text>

      <View style={styles.frame}>
        <Svg width={270} height={270} viewBox="0 0 270 270">
          <G fill="none" stroke={colors.lime} strokeWidth={6} strokeLinecap="round">
            <Path d="M4 50V20A16 16 0 0 1 20 4h30" />
            <Path d="M220 4h30a16 16 0 0 1 16 16v30" />
            <Path d="M266 220v30a16 16 0 0 1-16 16h-30" />
            <Path d="M50 266H20A16 16 0 0 1 4 250v-30" />
          </G>
        </Svg>
        <Animated.View style={[styles.scan, { transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [12, 244] }) }] }]} />
      </View>

      <Text variant="small" style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>
        O QR fica no topo do lobby, em <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14 }}>Mostrar QR</Text>.
      </Text>

      <View style={styles.card}>
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 15 }}>Sem câmera por perto?</Text>
        <Text variant="small" style={{ marginTop: 2 }}>Digite as 6 letras do código da partida.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/entrar')} style={styles.type}>
          <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 15 }}>Digitar código</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.inkDeep, paddingTop: 56 },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  pill: { flexDirection: 'row', alignItems: 'center', height: 44, backgroundColor: 'rgba(16,20,24,0.7)', borderRadius: 999, paddingLeft: 8, paddingRight: 14 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(16,20,24,0.7)', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 32, letterSpacing: -1, textAlign: 'center', marginTop: 28, marginHorizontal: 20, color: colors.paper },
  frame: { alignSelf: 'center', width: 270, height: 270, marginTop: 30 },
  scan: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.lime,
    shadowColor: colors.lime,
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 34,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.xl,
    padding: 16,
  },
  type: {
    marginTop: 12,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
