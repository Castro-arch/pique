import { useMutation, useQuery } from 'convex/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';

import { BENTO, BentoBackground, Sticker, type StickerKind } from '@/components/Bento';
import { Button } from '@/components/Button';
import { Appear, Pressy } from '@/components/Motion';
import { Logo } from '@/components/Nav';
import { Text } from '@/components/Text';
import { useDemoMode } from '@/lib/demoMode';
import { useCreateGame } from '@/lib/game';
import { permissionsSeen } from '@/lib/onboarding';
import { useScreenInsets } from '@/lib/screenInsets';
import { useMe } from '@/lib/useMe';
import { colors, fonts } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

// 22.4 Início: a mãozinha acena (é o "oi"), o nome vem grande com contorno de
// figurinha, e os dois botões (criar ou entrar pelo QR). No topo, figurinhas
// levam para Loja, Crew e Perfil.
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
  // Primeira vez aqui depois do nome: a tela única de permissões.
  useEffect(() => {
    if (demo) return;
    permissionsSeen().then((seen) => !seen && router.push('/permissoes'));
  }, [demo]);

  const requests = crew?.incoming.length ?? 0;
  const newGame = () => (demo ? router.push('/lobby') : create.run());

  return (
    <View style={{ flex: 1, backgroundColor: BENTO.ink }}>
      <BentoBackground glow="rgba(200,242,60,0.12)" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top, 20) + 14, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 20) + 14 }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Logo />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TopSticker kind="bag" color={colors.pink} label="Loja" onPress={() => router.push('/loja')} />
            <TopSticker kind="ghost" color="#B57CFF" label={requests ? `Crew, ${requests} pedidos` : 'Crew'} dot={requests > 0} onPress={() => router.push('/crew')} />
            <TopSticker kind="cup" color="#FFC23D" label="Perfil" onPress={() => router.push('/perfil')} />
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 24 }}>
          <Appear style={{ alignItems: 'center' }}>
            <WavingHand />
            <OutlinedName name={me.name || 'você'} />
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

        <Appear delay={160} style={{ gap: 10 }}>
          <Button label="Criar partida" loading={create.busy} onPress={newGame} />
          {create.error ? <Text variant="error">{create.error}</Text> : null}
          <Pressy accessibilityRole="button" accessibilityLabel="Entrar com QR Code" onPress={() => router.push('/entrar/qr')} style={styles.qr}>
            <View style={{ marginTop: -4 }}>
              <Sticker kind="qr" color={colors.lime} size={34} tilt={-8} />
            </View>
            <Text style={{ fontSize: 16, fontFamily: fonts.bodyStrong }}>Entrar com QR Code</Text>
          </Pressy>
          <Text onPress={() => router.push('/entrar')} style={styles.link}>
            ou digite o código
          </Text>
        </Appear>
        <Text onPress={() => router.push('/treino')} style={[styles.link, { marginTop: 6 }]}>
          Rodada de treino com bots
        </Text>
      </ScrollView>
    </View>
  );
}

// A mãozinha: acena ao abrir (gira pelo pulso) e repete de leve a cada 6 s.
function WavingHand() {
  const turn = useRef(new Animated.Value(0)).current;
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
  return (
    <Animated.View
      accessible
      accessibilityLabel="Oi"
      style={{ marginBottom: 6, transformOrigin: '50% 85%', transform: [{ rotate: turn.interpolate({ inputRange: [-30, 30], outputRange: ['-30deg', '30deg'] }) }] }}>
      <Sticker kind="hand" color={colors.pink} size={112} tilt={-12} />
    </Animated.View>
  );
}

// O nome com contorno preto e relevo, como as figurinhas. O contorno são cópias
// pretas deslocadas em volta (funciona igual no app e no site).
const RING = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-0.7, -0.7],
  [0.7, -0.7],
  [-0.7, 0.7],
  [0.7, 0.7],
];
function OutlinedName({ name }: { name: string }) {
  const size = Math.max(44, Math.min(96, Math.floor(600 / (name.length + 1))));
  const w = Math.max(3, Math.round(size * 0.055));
  const text = (dot: string) => (
    <>
      {name}
      <Text style={[styles.name, { fontSize: size, lineHeight: size * 1.05, color: dot }]}>.</Text>
    </>
  );
  const layer = (dx: number, dy: number, key: string) => (
    <Text key={key} aria-hidden style={[styles.name, { fontSize: size, lineHeight: size * 1.05, color: '#000', position: 'absolute', left: dx, top: dy }]}>
      {text('#000')}
    </Text>
  );
  return (
    <View accessibilityRole="header" accessibilityLabel={name} style={{ paddingHorizontal: w + 4, paddingBottom: w + 4 }}>
      <View>
        {/* relevo: uma cópia preta deslocada para baixo e para a direita, com contorno */}
        {RING.map(([x, y], i) => layer(w * 0.9 + x * w, w * 1.3 + y * w, 'r' + i))}
        {layer(w * 0.9, w * 1.3, 'r')}
        {RING.map(([x, y], i) => layer(x * w, y * w, 'c' + i))}
        <Text numberOfLines={1} style={[styles.name, { fontSize: size, lineHeight: size * 1.05 }]}>
          {text(colors.lime)}
        </Text>
      </View>
    </View>
  );
}

// Botão do topo com a figurinha (Loja, Crew, Perfil).
function TopSticker({ kind, color, label, dot, onPress }: { kind: StickerKind; color: string; label: string; dot?: boolean; onPress: () => void }) {
  return (
    <Pressy accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.top}>
      <Sticker kind={kind} color={color} size={30} tilt={kind === 'cup' ? -8 : 8} />
      {dot ? <View style={styles.dot} /> : null}
    </Pressy>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48 },
  top: { width: 48, height: 48, borderRadius: 16, backgroundColor: BENTO.tile, borderWidth: 1, borderColor: BENTO.line, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', right: 6, top: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.pink, borderWidth: 2, borderColor: BENTO.tile },
  name: { fontFamily: fonts.display, letterSpacing: -3, color: colors.paper },
  sub: { fontFamily: fonts.display, fontSize: 21, lineHeight: 25, letterSpacing: -0.4, color: '#C9C7BF', marginTop: 14, textAlign: 'center' },
  current: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, backgroundColor: '#1E2A12', borderWidth: 1, borderColor: colors.lime, borderRadius: 20, padding: 14 },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.lime, boxShadow: '0 0 0 6px rgba(200,242,60,0.2)' },
  leave: { fontSize: 12, color: BENTO.muted, marginTop: 2, textDecorationLine: 'underline' },
  qr: { height: 60, borderRadius: 24, backgroundColor: BENTO.tile, borderWidth: 1, borderColor: BENTO.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  link: { textAlign: 'center', fontSize: 14, fontFamily: fonts.bodyStrong, color: BENTO.muted, paddingVertical: 4 },
});
