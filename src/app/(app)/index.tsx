import { useMutation, useQuery } from 'convex/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

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

// 21.1 Início: nome grande, dois botões (criar ou entrar pelo QR) e o treino.
// No topo, figurinhas levam para Loja, Crew e Perfil.
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
          <Appear>
            <Text accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit style={styles.hello}>
              {`Oi,\n${me.name || 'você'}`}
              <Text style={[styles.hello, { color: colors.lime }]}>.</Text>
            </Text>
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
  hello: { fontFamily: fonts.display, fontSize: 96, lineHeight: 84, letterSpacing: -5.5, color: colors.paper },
  sub: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.5, color: colors.paper, marginTop: 18 },
  current: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, backgroundColor: '#1E2A12', borderWidth: 1, borderColor: colors.lime, borderRadius: 20, padding: 14 },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.lime, boxShadow: '0 0 0 6px rgba(200,242,60,0.2)' },
  leave: { fontSize: 12, color: BENTO.muted, marginTop: 2, textDecorationLine: 'underline' },
  qr: { height: 60, borderRadius: 24, backgroundColor: BENTO.tile, borderWidth: 1, borderColor: BENTO.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  link: { textAlign: 'center', fontSize: 14, fontFamily: fonts.bodyStrong, color: BENTO.muted, paddingVertical: 4 },
});
