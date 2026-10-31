import { useQuery } from 'convex/react';
import { router, useFocusEffect } from 'expo-router';
import { BarChart3, Settings, ShoppingBag } from '@/components/icons';
import { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarStack } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Text } from '@/components/Text';
import { photos } from '@/lib/demo';
import { useDemoMode } from '@/lib/demoMode';
import { useCreateGame } from '@/lib/game';
import { permissionsSeen } from '@/lib/onboarding';
import { useMe } from '@/lib/useMe';
import { api } from '../../../convex/_generated/api';
import { colors, fonts, radius } from '@/theme/tokens';

// 3.1 Home
export default function Home() {
  const me = useMe();
  const demo = useDemoMode();
  const create = useCreateGame();
  // Está numa partida: rodada valendo volta direto para o mapa (recarregou a
  // página, fechou o app, voltou demais). No lobby, o botão lá embaixo.
  const mine = useQuery(api.games.mine, demo ? 'skip' : {});
  const current = mine?.[0];
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
  return (
    <Screen>
      <View style={styles.top}>
        <Logo />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <RoundIcon label="Loja" onPress={() => router.push('/loja')}>
            <ShoppingBag size={20} color={colors.paper} />
          </RoundIcon>
          <RoundIcon label="Estatísticas" onPress={() => router.push('/estatisticas')}>
            <BarChart3 size={20} color={colors.paper} strokeWidth={2.4} />
          </RoundIcon>
          <RoundIcon label="Configurações" onPress={() => router.push('/ajustes')}>
            <Settings size={20} color={colors.paper} />
          </RoundIcon>
        </View>
      </View>

      <Spacer />

      <Text style={styles.hello} accessibilityRole="header">
        Oi,{'\n'}
        {me.name || 'você'}
        <Text style={[styles.hello, { color: colors.lime }]}>.</Text>
      </Text>
      <Text style={styles.sub}>Crie uma partida ou pegue o código de um amigo.</Text>

      {/* Prova social real: só aparece quando um amigo está mesmo num lobby.
          Ainda não existe lista de amigos, então só no modo demonstração. */}
      {demo ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leo está num lobby agora. Entrar na partida TACO42"
          onPress={() => router.push('/convite/TACO42')}
          style={styles.friend}>
          <AvatarStack sources={[photos.leo, photos.priya, photos.sasha]} size={28} ring={colors.inkRaised} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14 }}>Leo está num lobby agora</Text>
            <Text variant="small">TACO42 · 3 amigos lá dentro</Text>
          </View>
          <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 14 }}>Entrar</Text>
        </Pressable>
      ) : null}

      <View style={{ gap: 10, marginTop: 12 }}>
        {current ? (
          <Button
            label={`Voltar para a partida ${current.code}`}
            // No lobby ou depois do fim: o lobby (quem não é anfitrião vai para a espera da roleta).
            onPress={() => router.push({ pathname: current.status === 'lobby' || current.status === 'ended' ? '/lobby' : '/jogo', params: { id: current.gameId } })}
          />
        ) : null}
        <Button variant={current ? 'secondary' : 'primary'} label="Criar partida" loading={create.busy} onPress={() => (demo ? router.push('/lobby') : create.run())} />
        {create.error ? <Text variant="error">{create.error}</Text> : null}
        <Button label="Entrar com código" variant="secondary" onPress={() => router.push('/entrar')} />
        <Button label="Rodada de treino com bots" variant="link" onPress={() => router.push('/treino')} />
      </View>
    </Screen>
  );
}

function RoundIcon({ children, label, onPress }: { children: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.round}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.inkRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hello: { fontFamily: fonts.display, fontSize: 104, lineHeight: 92, letterSpacing: -6.5, color: colors.paper },
  sub: {
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: 28,
    letterSpacing: -0.75,
    color: colors.paper,
    marginTop: 22,
  },
  friend: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.inkRaised,
    borderRadius: radius.lg,
    padding: 14,
  },
});
