import { HeartPulse, Vibrate } from 'lucide-react-native';
import { Animated, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

// 10.4 Coração acelerado: borda vermelha que pulsa com a batida e o aviso
// no topo. Não diz de onde vem o caçador, só que ele está perto.
export function HeartbeatVignette({ pulse }: { pulse: Animated.Value }) {
  return (
    <Animated.View
      pointerEvents="none"
      aria-hidden
      style={[StyleSheet.absoluteFill, styles.vignette, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }]}
    />
  );
}

export function HeartbeatCard({ pulse }: { pulse: Animated.Value }) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={styles.icon}>
          <Animated.View style={{ transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }}>
            <HeartPulse size={28} color={colors.pink} strokeWidth={2} />
          </Animated.View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 0.5, color: colors.pink }}>CORAÇÃO ACELERADO</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 25, marginTop: 3 }}>Um caçador está a menos de 30 m</Text>
        </View>
      </View>
      <View style={styles.foot}>
        <Vibrate size={16} color={colors.paperMuted} />
        <Text style={{ fontSize: 13, color: colors.paperMuted }}>Vibrando forte. Ele não sabe que você sabe.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  vignette: { boxShadow: 'inset 0 0 90px 30px rgba(255,42,85,0.45)' },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 52,
    backgroundColor: 'rgba(16,20,24,0.95)',
    borderWidth: 2,
    borderColor: colors.pink,
    borderRadius: radius.xl,
    padding: 16,
  },
  icon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.pinkTint, alignItems: 'center', justifyContent: 'center' },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.inkBorder,
  },
});
