import * as Haptics from 'expo-haptics';
import { Eye } from '@/components/icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Sticker, type StickerKind } from '@/components/Bento';
import { Bar, mmss } from '@/components/Game';
import { Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

export type BoostKind = 'despiste' | 'sombra' | 'escudo';

// Os 3 boosts. Quanto mais forte, mais tempo quem pega fica visível.
export const BOOSTS: Record<BoostKind, { name: string; color: string; tint: string; sticker: StickerKind; reveal: number; effect: string }> = {
  despiste: { name: 'Despiste', color: colors.lime, tint: colors.limeTint, sticker: 'shuffle', reveal: 2, effect: 'Seu próximo ping sai a 60 m do lugar certo.' },
  sombra: { name: 'Sombra', color: '#B57CFF', tint: '#2A1F3D', sticker: 'ghost', reveal: 5, effect: 'Você some do próximo ping.' },
  escudo: { name: 'Escudo', color: '#5AC8FA', tint: '#12303D', sticker: 'shield', reveal: 8, effect: 'Por 2 min, nenhum caçador consegue te marcar.' },
};

// A figurinha do boost, levemente girada como as do Início.
const TILT: Record<BoostKind, number> = { despiste: -8, sombra: 8, escudo: -6 };
export function BoostSticker({ kind, size = 44, edge }: { kind: BoostKind; size?: number; edge?: boolean }) {
  return <Sticker kind={BOOSTS[kind].sticker} color={BOOSTS[kind].color} size={size} tilt={TILT[kind]} edge={edge ? colors.paper : undefined} />;
}

const native = Platform.OS !== 'web';

// 10.1 Boost no mapa: a figurinha e quantos segundos ele custa.
export function BoostPin({ kind }: { kind: BoostKind }) {
  const b = BOOSTS[kind];
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <BoostSticker kind={kind} size={46} edge />
      <View style={styles.pinTag}>
        <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong }}>
          {b.name}
          <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: b.color }}> · {b.reveal} s</Text>
        </Text>
      </View>
    </View>
  );
}

// As 2 bolinhas dos boosts guardados, à direita da legenda. Quando entra um
// boost novo, a bolinha estoura: cresce, solta um anel e faíscas, e assenta.
// Qual boost acabou de chegar (para animar). Na primeira leitura só anota o que já tinha.
export function useFreshBoost(boosts: { id: string }[]) {
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
  return fresh;
}

export function BoostSlots({ boosts, onPress }: { boosts: { id: string; kind: BoostKind }[]; onPress: (b: { id: string; kind: BoostKind }) => void }) {
  const fresh = useFreshBoost(boosts);
  return (
    <View style={styles.slots} accessibilityLabel={`Seus boosts: ${boosts.length} de 2`}>
      {[0, 1].map((i) => {
        const b = boosts[i];
        if (!b) return <EmptySlot key={`vazio-${i}`} />;
        return <BoostSlot key={b.id} boost={b} pop={b.id === fresh} onPress={() => onPress(b)} />;
      })}
    </View>
  );
}

const SPARKS = [0, 60, 120, 180, 240, 300];

export function EmptySlot({ size = 42 }: { size?: number }) {
  return <View style={[styles.slot, styles.empty, { width: size, height: size, borderRadius: size / 2 }]} />;
}

// Uma bolinha de boost guardado. pop = acabou de pegar: estoura, solta anel e faíscas.
export function BoostSlot({ boost, pop, onPress, size = 42 }: { boost: { id: string; kind: BoostKind }; pop: boolean; onPress: () => void; size?: number }) {
  const b = BOOSTS[boost.kind];
  const round = { width: size, height: size, borderRadius: size / 2 };
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
              round,
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
                  left: size / 2 - 2,
                  top: size / 2 - 2,
                  backgroundColor: b.color,
                  opacity: burst.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0] }),
                  transform: [{ rotate: `${deg}deg` }, { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, -32] }) }],
                },
              ]}
            />
          ))}
        </>
      ) : null}
      <Animated.View style={[round, { alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }]}>
        <BoostSticker kind={boost.kind} size={Math.round(size * 1.05)} edge />
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
  pinTag: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: colors.inkRaised },
  slots: { position: 'absolute', right: 16, top: 224, flexDirection: 'row', gap: 8 },
  slot: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  empty: { borderStyle: 'dashed', borderColor: '#55606B', backgroundColor: 'rgba(16,20,24,0.7)' },
  ring: { position: 'absolute', left: 0, top: 0, width: 42, height: 42, borderRadius: 21, borderWidth: 2 },
  spark: { position: 'absolute', left: 19, top: 19, width: 4, height: 4, borderRadius: 2 },
  reveal: { position: 'absolute', left: 16, right: 16, top: 52, borderRadius: radius.xl, padding: 16, backgroundColor: colors.pink },
});
