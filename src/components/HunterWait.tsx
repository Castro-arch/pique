import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Avatar } from '@/components/Avatar';
import { Ellipsis, Lock, Radio as RadioIcon } from '@/components/icons';
import { Text } from '@/components/Text';
import { mmss } from '@/components/Game';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts, radius } from '@/theme/tokens';

// 14.1 Caçador travado: durante a vantagem a tela do caçador não mostra o mapa,
// só a contagem. 14.2 "Vai!": quando a vantagem acaba, a tela fica rosa por
// alguns segundos e o mapa abre sozinho.

const R = 118;
const C = 2 * Math.PI * R;

export function HunterLocked({
  id,
  left,
  total,
  code,
  round,
  mates,
}: {
  id: string;
  left: number; // segundos até liberar
  total: number; // segundos de vantagem
  code: string;
  round: number;
  mates: string[];
}) {
  const insets = useScreenInsets();
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  const share = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const team = mates.length === 0 ? 'Você caça sozinho' : `Você caça com ${mates.length > 1 ? `${mates.slice(0, -1).join(', ')} e ${mates[mates.length - 1]}` : mates[0]}`;

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 44) + 12, paddingBottom: Math.max(insets.bottom, 20) + 14 }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }]}
      />
      <View style={styles.head}>
        <View style={[styles.chip, { backgroundColor: colors.pinkTint }]}>
          <Lock size={14} color="#FF8FA8" strokeWidth={2.6} />
          <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: '#FF8FA8' }}>Você caça · travado</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: colors.inkRaised }]}>
          <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong }}>{`${code} · Rodada ${round}`}</Text>
        </View>
      </View>

      <View style={styles.ring}>
        <Svg width={260} height={260} viewBox="0 0 260 260" style={StyleSheet.absoluteFill}>
          <Circle cx={130} cy={130} r={R} fill="none" stroke={colors.inkBorder} strokeWidth={10} />
          <Circle
            cx={130}
            cy={130}
            r={R}
            fill="none"
            stroke={colors.pink}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${C * share} ${C}`}
            transform="rotate(-90 130 130)"
          />
        </Svg>
        <Text variant="small">Você sai em</Text>
        <Text accessibilityRole="timer" style={styles.time}>
          {mmss(left)}
        </Text>
        <Text style={{ marginTop: 6, fontSize: 13, fontFamily: fonts.bodyStrong, color: '#FF8FA8' }}>de {mmss(total)} de vantagem</Text>
      </View>

      <View style={{ marginTop: 28, alignItems: 'center' }}>
        <Text style={styles.title}>
          Fique parado<Text style={[styles.title, { color: colors.pink }]}>.</Text>
        </Text>
        <Text variant="muted" style={{ marginTop: 10, textAlign: 'center', maxWidth: 300 }}>
          Os corredores estão se escondendo. O mapa abre sozinho quando a vantagem acabar.
        </Text>
      </View>

      <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <View style={{ flexDirection: 'row' }}>
          <Avatar name="Você" size={30} state="hunter" />
          {mates.slice(0, 3).map((n) => (
            <Avatar key={n} name={n} size={30} state="hunter" style={{ marginLeft: -8 }} />
          ))}
        </View>
        <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong }}>{team}</Text>
      </View>

      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/radio', params: { id } })} style={styles.radio}>
          <RadioIcon size={18} color="#FF8FA8" strokeWidth={2.2} />
          <Text style={{ fontSize: 16, fontFamily: fonts.bodyStrong }}>Combinar no Radio</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Mais opções" onPress={() => router.push({ pathname: '/menu', params: { id } })} style={styles.more}>
          <Ellipsis size={22} color={colors.paper} />
        </Pressable>
      </View>
      <Text variant="label" style={{ marginTop: 10, textAlign: 'center' }}>
        Sem espiar: o mapa fica fechado até o fim da contagem.
      </Text>
    </View>
  );
}

export function HuntGo({ code, endsIn }: { code: string; endsIn: string }) {
  const insets = useScreenInsets();
  const k = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(k, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
    Animated.timing(bar, { toValue: 1, duration: GO_MS, easing: Easing.linear, useNativeDriver: false }).start();
  }, [k, bar]);
  return (
    <View style={[styles.go, { paddingTop: Math.max(insets.top, 44) + 12, paddingBottom: Math.max(insets.bottom, 20) + 14 }]}>
      {[80, 130, 180].map((r, i) => (
        <View key={r} pointerEvents="none" style={[styles.wave, { width: r * 2, height: r * 2, borderRadius: r, marginLeft: -r, marginTop: -r, opacity: 0.35 - i * 0.12 }]} />
      ))}
      <View style={styles.head}>
        <View style={[styles.chip, { backgroundColor: colors.pinkInk }]}>
          <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong }}>{`${code} · ${endsIn}`}</Text>
        </View>
        <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.pinkInk }}>você caça</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.Text style={[styles.vai, { transform: [{ scale: k.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>
          Vai<Text style={[styles.vai, { color: colors.paper }]}>!</Text>
        </Animated.Text>
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: 36, lineHeight: 38, color: colors.pinkInk }}>Caçada liberada.</Text>
      <Text style={{ marginTop: 10, fontSize: 16, lineHeight: 22, fontFamily: fonts.bodyMedium, color: colors.pinkInk }}>
        O primeiro ping já vem. Até lá, siga o que a crew combinou.
      </Text>
      <View style={{ marginTop: 18, height: 6, borderRadius: 3, backgroundColor: 'rgba(42,6,16,0.2)' }}>
        <Animated.View style={{ height: 6, borderRadius: 3, backgroundColor: colors.pinkInk, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      </View>
      <Text style={{ marginTop: 8, fontSize: 12, fontFamily: fonts.bodyStrong, color: colors.pinkInk, opacity: 0.8 }}>Abrindo o mapa…</Text>
    </View>
  );
}

export const GO_MS = 3000;

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.inkSunken, paddingHorizontal: 20, overflow: 'hidden' },
  halo: {
    position: 'absolute',
    left: '50%',
    top: 330,
    width: 620,
    height: 620,
    marginLeft: -310,
    marginTop: -310,
    borderRadius: 310,
    backgroundColor: 'rgba(255,42,85,0.10)',
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  ring: { marginTop: 30, alignSelf: 'center', width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  time: { fontFamily: fonts.display, fontSize: 76, lineHeight: 80, letterSpacing: -3, fontVariant: ['tabular-nums'] },
  title: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: -1.6 },
  radio: {
    flex: 1,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  more: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, alignItems: 'center', justifyContent: 'center' },
  go: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.pink, paddingHorizontal: 20, overflow: 'hidden' },
  wave: { position: 'absolute', left: '50%', top: '42%', borderWidth: 3, borderColor: colors.pinkInk },
  vai: { fontFamily: fonts.display, fontSize: 170, lineHeight: 172, letterSpacing: -10, color: colors.pinkInk },
});
