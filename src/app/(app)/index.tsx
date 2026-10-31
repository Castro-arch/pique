import { useMutation, useQuery } from 'convex/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { setStatusBarStyle } from 'expo-status-bar';

import { BENTO, Sticker, type StickerKind } from '@/components/Bento';
import { Button } from '@/components/Button';
import { Appear, Pressy } from '@/components/Motion';
import { Logo } from '@/components/Nav';
import { OutlinedText } from '@/components/OutlinedText';
import { Text } from '@/components/Text';
import { useDemoMode } from '@/lib/demoMode';
import { useCreateGame } from '@/lib/game';
import { permissionsSeen } from '@/lib/onboarding';
import { useScreenInsets } from '@/lib/screenInsets';
import { useMe } from '@/lib/useMe';
import { colors, fonts } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

// 22.5 Início (verde): a mãozinha acena (é o "oi"), o nome vem grande com
// contorno de figurinha e, embaixo, as figurinhas de Loja, Crew e Perfil em
// cima dos dois botões (criar, preto; entrar pelo QR, branco).
export default function Home() {
  const me = useMe();
  const demo = useDemoMode();
  const insets = useScreenInsets();
  const create = useCreateGame();
  const mine = useQuery(api.games.mine, demo ? 'skip' : {});
  const crew = useQuery(api.friends.list, demo ? 'skip' : {});
  const leave = useMutation(api.games.leave);
  const current = mine?.[0];

  // Rodada valendo: volta direto para o mapa (recarregou, fechou o app...).
  useFocusEffect(
    useCallback(() => {
      if (current && (current.status === 'headstart' || current.status === 'hunt')) {
        router.replace({ pathname: '/jogo', params: { id: current.gameId } });
      }
    }, [current?.gameId, current?.status]), // eslint-disable-line react-hooks/exhaustive-deps
  );
  // Fundo verde: relógio e bateria em preto só enquanto o Início está na frente.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      return () => setStatusBarStyle('light');
    }, []),
  );
  // Primeira vez aqui depois do nome: a tela única de permissões.
  useEffect(() => {
    if (demo) return;
    permissionsSeen().then((seen) => !seen && router.push('/permissoes'));
  }, [demo]);

  // Easter egg: segurar a mãozinha 3 vezes = tapa no nome.
  const shake = useRef(new Animated.Value(0)).current;
  const squash = useRef(new Animated.Value(1)).current;
  const pow = useRef(new Animated.Value(0)).current;
  const hit = () => {
    if (Platform.OS === 'web') (navigator as Navigator & { vibrate?: (p: number[]) => boolean }).vibrate?.([70, 40, 30]);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    shake.setValue(0);
    squash.setValue(0.8);
    pow.setValue(0);
    Animated.parallel([
      Animated.sequence([14, -12, 9, -6, 3, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 55, useNativeDriver: true }))),
      Animated.spring(squash, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
      Animated.timing(pow, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  const requests = crew?.incoming.length ?? 0;
  const newGame = () => (demo ? router.push('/lobby') : create.run());

  return (
    <View style={{ flex: 1, backgroundColor: colors.lime }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top, 20) + 14, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 4 }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Logo ink color={BENTO.ink} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 24 }}>
          <Appear style={[{ alignItems: 'center' }, NO_SELECT]}>
            <WavingHand onSlap={hit} />
            <Animated.View style={{ transform: [{ translateX: shake }, { scaleY: squash }] }}>
              <OutlinedName name={(me.name || 'você').trim().split(/\s+/)[0]} />
            </Animated.View>
            <Animated.Text
              selectable={false}
              pointerEvents="none"
              style={[styles.pow, { opacity: pow.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }), transform: [{ scale: pow.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1.25, 1] }) }, { rotate: '-10deg' }] }]}>
              PÁ!
            </Animated.Text>
          </Appear>
          <Appear delay={80}>
            <Text style={styles.sub}>{'Crie uma partida ou entre\npelo QR de um amigo.'}</Text>
          </Appear>
        </View>

        {current ? (
          <Appear delay={120}>
            <Pressy onPress={() => router.push({ pathname: current.status === 'lobby' ? '/lobby' : '/jogo', params: { id: current.gameId } })} style={styles.current}>
              <View style={styles.liveDot} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: fonts.bodyStrong }}>{`Voltar para a partida ${current.code}`}</Text>
                <Text onPress={() => leave({ gameId: current.gameId }).catch(() => {})} style={styles.leave}>
                  Sair dessa partida
                </Text>
              </View>
              <Text style={{ fontSize: 18, color: colors.lime }}>→</Text>
            </Pressy>
          </Appear>
        ) : null}

        <Appear delay={140} style={styles.tops}>
          <TopSticker kind="bag" color={colors.pink} label="Loja" onPress={() => router.push('/loja')} />
          <TopSticker kind="ghost" color="#B57CFF" label={requests ? `Crew, ${requests} pedidos` : 'Crew'} dot={requests > 0} onPress={() => router.push('/crew')} />
          <TopSticker kind="cup" color="#FFC23D" label="Perfil" onPress={() => router.push('/perfil')} />
        </Appear>
        <Appear delay={160} style={{ gap: 10 }}>
          <Button label="Criar partida" variant="dark" loading={create.busy} onPress={newGame} style={styles.create} />
          {create.error ? <Text variant="error">{create.error}</Text> : null}
          <Pressy accessibilityRole="button" accessibilityLabel="Entrar com QR Code" onPress={() => router.push('/entrar/qr')} style={styles.qr}>
            <View style={{ marginTop: -4 }}>
              <Sticker kind="qr" color={colors.lime} size={34} tilt={-8} />
            </View>
            <Text style={{ fontSize: 16, fontFamily: fonts.bodyStrong, color: BENTO.ink }}>Entrar com QR Code</Text>
          </Pressy>
          <Text onPress={() => router.push('/entrar')} style={styles.link}>
            ou digite o código
          </Text>
        </Appear>
      </ScrollView>
    </View>
  );
}

// A mãozinha: acena ao abrir (gira pelo pulso) e repete de leve a cada 6 s.
// Segurar nela 3 vezes seguidas: toma impulso e desce um tapa no nome.
function WavingHand({ onSlap }: { onSlap: () => void }) {
  const turn = useRef(new Animated.Value(0)).current;
  const swing = useRef(new Animated.Value(0)).current; // graus extras do tapa
  const drop = useRef(new Animated.Value(0)).current; // quanto desce até o nome
  const holds = useRef({ n: 0, at: 0 });
  const busy = useRef(false);

  const onHold = () => {
    if (busy.current) return;
    const now = Date.now();
    holds.current = { n: now - holds.current.at < 4000 ? holds.current.n + 1 : 1, at: now };
    if (holds.current.n < 3) {
      // aviso de que contou: tremidinha
      if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
      Animated.sequence([
        Animated.timing(swing, { toValue: -8, duration: 70, useNativeDriver: true }),
        Animated.timing(swing, { toValue: 8, duration: 70, useNativeDriver: true }),
        Animated.timing(swing, { toValue: 0, duration: 70, useNativeDriver: true }),
      ]).start();
      return;
    }
    holds.current = { n: 0, at: 0 };
    busy.current = true;
    Animated.sequence([
      // impulso para trás
      Animated.parallel([
        Animated.timing(swing, { toValue: -50, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(drop, { toValue: -14, duration: 240, useNativeDriver: true }),
      ]),
      // o tapa
      Animated.parallel([
        Animated.timing(swing, { toValue: 75, duration: 110, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(drop, { toValue: 46, duration: 110, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start(() => {
      onSlap();
      Animated.parallel([
        Animated.spring(swing, { toValue: 0, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.spring(drop, { toValue: 0, friction: 6, tension: 60, useNativeDriver: true }),
      ]).start(() => (busy.current = false));
    });
  };
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const wave = (times: number, deg: number) =>
      Animated.sequence(
        Array.from({ length: times }, () => [
          Animated.timing(turn, { toValue: deg, duration: 160, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(turn, { toValue: -deg * 0.6, duration: 160, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]).flat().concat(Animated.timing(turn, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true })),
      );
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || stop) return;
      const loop = (first: boolean) =>
        wave(first ? 3 : 2, first ? 18 : 12).start(() => {
          if (!stop) timer = setTimeout(() => loop(false), 6000);
        });
      timer = setTimeout(() => loop(true), 350);
    });
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
      turn.stopAnimation();
    };
  }, [turn]);
  // no site, segurar o dedo abriria o menu de copiar/pesquisar do navegador
  const press = useRef<any>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = press.current as unknown as HTMLElement | null;
    const block = (e: Event) => e.preventDefault();
    el?.addEventListener('contextmenu', block);
    return () => el?.removeEventListener('contextmenu', block);
  }, []);
  const angle = Animated.add(turn, swing).interpolate({ inputRange: [-120, 120], outputRange: ['-120deg', '120deg'] });
  return (
    <Pressable ref={press} onLongPress={onHold} delayLongPress={320} accessibilityLabel="Oi" style={[{ zIndex: 2 }, NO_SELECT]}>
      <Animated.View style={{ marginBottom: 6, transformOrigin: '50% 85%', transform: [{ translateY: drop }, { rotate: angle }] }}>
        <Sticker kind="hand" color={colors.pink} size={112} tilt={-12} />
      </Animated.View>
    </Pressable>
  );
}

// O nome grande com contorno de figurinha; o tamanho diminui para nomes longos.
function OutlinedName({ name }: { name: string }) {
  const size = Math.max(44, Math.min(96, Math.floor(600 / (name.length + 1))));
  return <OutlinedText text={name} size={size} dot={colors.pink} />;
}

// Sem seleção de texto nem menu do toque longo (iPhone e Android, no site).
const NO_SELECT = Platform.OS === 'web' ? ({ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'manipulation' } as object) : null;

// Figurinha solta que leva para Loja, Crew ou Perfil.
function TopSticker({ kind, color, label, dot, onPress }: { kind: StickerKind; color: string; label: string; dot?: boolean; onPress: () => void }) {
  return (
    <Pressy accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.top}>
      <Sticker kind={kind} color={color} size={40} tilt={kind === 'cup' ? -8 : 8} />
      {dot ? <View style={styles.dot} /> : null}
    </Pressy>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 48 },
  tops: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginBottom: 18 },
  top: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', right: 4, top: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.pink, borderWidth: 2, borderColor: BENTO.ink },
  create: { minHeight: 60, borderRadius: 24, backgroundColor: BENTO.ink, boxShadow: '0 10px 24px rgba(11,15,19,0.25)' },
  pow: { position: 'absolute', right: 10, top: 70, fontFamily: fonts.display, fontSize: 46, color: '#FFFFFF', textShadowColor: '#000', textShadowOffset: { width: 3, height: 4 }, textShadowRadius: 0 },
  sub: { fontFamily: fonts.display, fontSize: 21, lineHeight: 25, letterSpacing: -0.4, color: BENTO.ink, opacity: 0.78, marginTop: 14, textAlign: 'center' },
  current: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, backgroundColor: BENTO.ink, borderRadius: 20, padding: 14 },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.lime, boxShadow: '0 0 0 6px rgba(200,242,60,0.2)' },
  leave: { fontSize: 12, color: BENTO.muted, marginTop: 2, textDecorationLine: 'underline' },
  qr: { height: 60, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: BENTO.ink, boxShadow: '3px 4px 0 #0B0F13', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  link: { textAlign: 'center', fontSize: 14, fontFamily: fonts.bodyStrong, color: BENTO.ink, opacity: 0.65, paddingVertical: 4 },
});
