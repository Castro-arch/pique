import * as Haptics from 'expo-haptics';
import { Eye, Ghost, ShieldCheck, Shuffle } from '@/components/icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Bar, mmss } from '@/components/Game';
import { Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

export type BoostKind = 'despiste' | 'sombra' | 'escudo';

// Os 3 boosts. Quanto mais forte, mais tempo quem pega fica visível.
export const BOOSTS: Record<BoostKind, { name: string; color: string; tint: string; Icon: typeof Ghost; reveal: number; effect: string }> = {
  despiste: { name: 'Despiste', color: colors.lime, tint: colors.limeTint, Icon: Shuffle, reveal: 2, effect: 'Seu próximo ping sai a 60 m do lugar certo.' },
  sombra: { name: 'Sombra', color: colors.amber, tint: colors.amberTint, Icon: Ghost, reveal: 5, effect: 'Você some do próximo ping.' },
  escudo: { name: 'Escudo', color: colors.paper, tint: colors.ink, Icon: ShieldCheck, reveal: 8, effect: 'Por 2 min, nenhum caçador consegue te marcar.' },
};

const native = Platform.OS !== 'web';

// 10.1 Boost no mapa: quadrado com o ícone e quantos segundos ele custa.
export function BoostPin({ kind }: { kind: BoostKind }) {
  const b = BOOSTS[kind];
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={[styles.pin, { borderColor: b.color, boxShadow: `0 0 0 6px ${b.color}2E` }]}>
        <b.Icon size={22} color={b.color} strokeWidth={2} />
      </View>
      <View style={styles.pinTag}>
        <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong }}>
          {b.name}
          <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: kind === 'escudo' ? colors.paper : b.color }}> · {b.reveal} s</Text>
        </Text>
      </View>
    </View>
  );
}

// As 2 bolinhas dos boosts guardados, à direita da legenda. Quando entra um
// boost novo, a bolinha estoura: cresce, solta um anel e faíscas, e assenta.
export function BoostSlots({ boosts, onPress }: { boosts: { id: string; kind: BoostKind }[]; onPress: (b: { id: string; kind: BoostKind }) => void }) {
  const known = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);

  useEffect(() => {
    const ids = new Set(boosts.map((b) => b.id));
    // Na primeira vez só anota o que já tinha; anima só o que chegar depois.
    if (known.current) {
      const added = boosts.find((b) => !known.current!.has(b.id));
      if (added) {
        setFresh(added.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
    known.current = ids;
  }, [boosts]);

  return (
    <View style={styles.slots} accessibilityLabel={`Seus boosts: ${boosts.length} de 2`}>
      {[0, 1].map((i) => {
        const b = boosts[i];
        if (!b) return <View key={`vazio-${i}`} style={[styles.slot, styles.empty]} />;
        return <Slot key={b.id} boost={b} pop={b.id === fresh} onPress={() => onPress(b)} />;
      })}
    </View>
  );
}

const SPARKS = [0, 60, 120, 180, 240, 300];

function Slot({ boost, pop, onPress }: { boost: { id: string; kind: BoostKind }; pop: boolean; onPress: () => void }) {
  const b = BOOSTS[boost.kind];
  const scale = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pop) return;
    scale.setValue(0);
    burst.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.4, duration: 220, easing: Easing.out(Easing.back(2)), useNativeDriver: native }),
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: native }),
      ]),
      Animated.timing(burst, { toValue: 1, duration: 700, delay: 120, easing: Easing.out(Easing.quad), useNativeDriver: native }),
    ]).start();
  }, [pop, scale, burst]);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Usar ${b.name}`} onPress={onPress} hitSlop={4}>
      {pop ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              { borderColor: b.color, opacity: burst.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0] }), transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }] },
            ]}
          />
          {SPARKS.map((deg) => (
            <Animated.View
              key={deg}
              pointerEvents="none"
              style={[
                styles.spark,
                {
                  backgroundColor: b.color,
                  opacity: burst.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0] }),
                  transform: [{ rotate: `${deg}deg` }, { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, -32] }) }],
                },
              ]}
            />
          ))}
        </>
      ) : null}
      <Animated.View style={[styles.slot, { backgroundColor: b.tint, borderColor: b.color, transform: [{ scale }] }]}>
        <b.Icon size={20} color={b.color} strokeWidth={2.2} />
      </Animated.View>
    </Pressable>
  );
}

// 10.2 O preço do boost: os caçadores te veem ao vivo por alguns segundos.
export function RevealAlert({ until, now }: { until: number; now: number }) {
  const total = useRef(Math.max(1, Math.round((until - now) / 1000))).current;
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <View accessibilityRole="alert" style={styles.reveal}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Eye size={16} color={colors.pinkInk} strokeWidth={2.4} />
        <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, letterSpacing: 0.3, color: colors.pinkInk }}>OS CAÇADORES TE VEEM AGORA</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 58, color: colors.pinkInk }}>{mmss(left).replace(/^0(\d):/, '$1:')}</Text>
        <Text style={{ fontSize: 15, lineHeight: 19, fontFamily: fonts.bodyStrong, color: colors.pinkInk }}>é o preço do boost.{'\n'}Saia daí rápido.</Text>
      </View>
      <Bar value={left / total} color={colors.pinkInk} track="rgba(42,6,16,0.2)" style={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  pin: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  pinTag: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: colors.inkRaised },
  slots: { position: 'absolute', right: 16, top: 224, flexDirection: 'row', gap: 8 },
  slot: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  empty: { borderStyle: 'dashed', borderColor: '#55606B', backgroundColor: 'rgba(16,20,24,0.7)' },
  ring: { position: 'absolute', left: 0, top: 0, width: 42, height: 42, borderRadius: 21, borderWidth: 2 },
  spark: { position: 'absolute', left: 19, top: 19, width: 4, height: 4, borderRadius: 2 },
  reveal: { position: 'absolute', left: 16, right: 16, top: 52, borderRadius: radius.xl, padding: 16, backgroundColor: colors.pink },
});
