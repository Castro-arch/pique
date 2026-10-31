import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { Radio as RadioIcon } from '@/components/icons';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

// 17.1 e 17.2: o Radio vira uma bolinha no canto direito, em cima das abas.
// Quando chega mensagem (ou muda o aviso de boost), ela abre mostrando o texto
// por alguns segundos e fecha sozinha. Tocar em qualquer uma abre o Radio.

const OPEN_MS = 5000;

type Msg = { id: string; text: string | null; kind: string; from: { name: string; isMe: boolean } | null };
export type Peek = { from: string; text: string; hunter: boolean };

export function useRadioPeek(messages: Msg[] | undefined, boostLine: string | null, boostKey: string | null, hunterTeam: boolean) {
  const [peek, setPeek] = useState<Peek | null>(null);
  const [unread, setUnread] = useState(0);
  const seen = useRef<string | null | undefined>(undefined);
  const lastBoost = useRef<string | null>(null);

  useEffect(() => {
    if (!messages) return;
    const last = messages[messages.length - 1];
    // Na primeira leitura só marca onde está: mensagem velha não abre a bolinha.
    if (seen.current === undefined) {
      seen.current = last?.id ?? null;
      return;
    }
    if (!last || last.id === seen.current) return;
    const idx = messages.findIndex((m) => m.id === seen.current);
    const fresh = messages.slice(idx + 1).filter((m) => !m.from?.isMe);
    seen.current = last.id;
    if (fresh.length === 0) return;
    const m = fresh[fresh.length - 1];
    setUnread((n) => n + fresh.length);
    setPeek({
      from: m.from?.name ?? 'Radio',
      text: m.text ?? (m.kind === 'audio' ? 'Mandou um áudio.' : 'Nova mensagem.'),
      hunter: !!m.from && hunterTeam,
    });
  }, [messages, hunterTeam]);

  useEffect(() => {
    if (boostKey && boostLine && boostKey !== lastBoost.current) setPeek({ from: 'Radio', text: boostLine, hunter: false });
    lastBoost.current = boostKey;
  }, [boostKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!peek) return;
    const t = setTimeout(() => setPeek(null), OPEN_MS);
    return () => clearTimeout(t);
  }, [peek]);

  const open = (id: string) => {
    setPeek(null);
    setUnread(0);
    router.push({ pathname: '/radio', params: { id } });
  };
  return { peek, unread, open };
}

export function RadioBubble({ peek, unread, bottom, onPress }: { peek: Peek | null; unread: number; bottom: number; onPress: () => void }) {
  const grow = useRef(new Animated.Value(0)).current;
  const timer = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(grow, { toValue: peek ? 1 : 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    if (peek) {
      timer.setValue(1);
      Animated.timing(timer, { toValue: 0, duration: OPEN_MS, easing: Easing.linear, useNativeDriver: false }).start();
    }
  }, [peek, grow, timer]);

  if (peek) {
    return (
      <Animated.View style={[styles.open, { bottom, opacity: grow, transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }, peek.hunter && { borderColor: colors.pink }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${peek.from}: ${peek.text}. Abrir Radio`} onPress={onPress} style={styles.openRow}>
          <Text numberOfLines={2} style={{ flex: 1, fontSize: 14, lineHeight: 19 }}>
            <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong, color: peek.hunter ? '#FF8FA8' : colors.paperMuted }}>{peek.from}</Text> · {peek.text}
          </Text>
          <View style={styles.openIcon}>
            <RadioIcon size={20} color={colors.lime} strokeWidth={2.2} />
          </View>
        </Pressable>
        <View style={styles.track}>
          <Animated.View style={[styles.bar, { width: timer.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </Animated.View>
    );
  }
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={unread ? `Radio, ${unread} novas` : 'Radio'} onPress={onPress} style={[styles.bubble, { bottom }]}>
      <RadioIcon size={22} color={colors.lime} strokeWidth={2.2} />
      {unread ? (
        <View style={styles.badge}>
          <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: colors.pinkInk }}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(26,32,39,0.96)',
    borderWidth: 1,
    borderColor: colors.inkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -2,
    top: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.inkSunken,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  open: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(26,32,39,0.98)',
    borderWidth: 1,
    borderColor: colors.inkBorder,
    overflow: 'hidden',
  },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 14, paddingLeft: 16, paddingRight: 8 },
  openIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  track: { position: 'absolute', left: 16, right: 60, bottom: 7, height: 2, borderRadius: 1, backgroundColor: colors.inkBorder },
  bar: { height: 2, borderRadius: 1, backgroundColor: colors.lime },
});
