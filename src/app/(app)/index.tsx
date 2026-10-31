import { useMutation, useQuery } from 'convex/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ArrowPill, BENTO, BentoBackground, BottomNav, Hero, NAV_SPACE, Sticker, Tile, TileHead } from '@/components/Bento';
import { Appear } from '@/components/Motion';
import { Text } from '@/components/Text';
import { useDemoMode } from '@/lib/demoMode';
import { useCreateGame, useJoinGame } from '@/lib/game';
import { permissionsSeen } from '@/lib/onboarding';
import { useScreenInsets } from '@/lib/screenInsets';
import { useMe } from '@/lib/useMe';
import { colors, fonts } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

const minutes = (ms: number) => `${Math.round(ms / 60000)} min`;

// 20.1 Início: o destaque muda com o momento (partida aberta, amigo num
// lobby ou "bora jogar"), e os blocos levam para crew, loja, medalhas e convite.
export default function Home() {
  const me = useMe();
  const demo = useDemoMode();
  const insets = useScreenInsets();
  const create = useCreateGame();
  const join = useJoinGame();
  const mine = useQuery(api.games.mine, demo ? 'skip' : {});
  const crew = useQuery(api.friends.list, demo ? 'skip' : {});
  const profile = useQuery(api.friends.profile, demo ? 'skip' : {});
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

  const friends = crew?.friends ?? [];
  const online = friends.filter((f) => f.live);
  const lobbyFriend = online.find((f) => f.live?.status === 'lobby');
  const medals = profile?.medals ?? [];
  const won = medals.filter((m) => m.won).length;
  const newGame = () => (demo ? router.push('/lobby') : create.run());

  const enter = async (code: string) => {
    const r = await join(code);
    if (r.ok) router.push({ pathname: '/aguardando', params: { id: r.gameId } });
  };

  let hero;
  if (current) {
    hero = (
      <Hero from="#E6FF5A" to="#86D63C" sticker={<View style={styles.heroSticker}><Sticker kind="run" color={colors.lime} size={84} tilt={12} /></View>}>
        <Text style={styles.kicker}>VOCÊ ESTÁ NUMA PARTIDA</Text>
        <Text style={styles.heroTitle}>{`Partida\n${current.code}`}</Text>
        <View style={styles.heroFoot}>
          <ArrowPill label="Voltar" onPress={() => router.push({ pathname: current.status === 'lobby' ? '/lobby' : '/jogo', params: { id: current.gameId } })} />
          <Text onPress={() => leave({ gameId: current.gameId }).catch(() => {})} style={styles.heroLink}>
            Sair dessa partida
          </Text>
        </View>
      </Hero>
    );
  } else if (lobbyFriend?.live) {
    const live = lobbyFriend.live;
    hero = (
      <Hero from="#E6FF5A" to="#86D63C" sticker={<View style={styles.heroSticker}><Sticker kind="hand" color={colors.pink} size={92} tilt={14} /></View>}>
        <Text style={styles.kicker}>CREW JOGANDO AGORA</Text>
        <Text style={styles.heroTitle}>{`${lobbyFriend.name} abriu\num lobby`}</Text>
        <View style={styles.heroFoot}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Avatar name={lobbyFriend.name} size={30} frame={lobbyFriend.frame} />
            <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: BENTO.ink }}>{`${live.players} na partida`}</Text>
          </View>
          <ArrowPill label="Entrar" onPress={() => enter(live.code)} />
        </View>
      </Hero>
    );
  } else {
    hero = (
      <Hero from="#E6FF5A" to="#86D63C" sticker={<View style={styles.heroSticker}><Sticker kind="run" color={colors.lime} size={84} tilt={12} /></View>}>
        <Text style={styles.kicker}>PIQUE-ESCONDE NA RUA</Text>
        <Text style={styles.heroTitle}>{'Bora\njogar?'}</Text>
        <View style={styles.heroFoot}>
          <ArrowPill label={create.busy ? 'Criando…' : 'Criar partida'} onPress={newGame} />
        </View>
      </Hero>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BENTO.ink }}>
      <BentoBackground />
      <ScrollView
        contentContainerStyle={{ paddingTop: Math.max(insets.top, 20) + 14, paddingHorizontal: 16, paddingBottom: NAV_SPACE + Math.max(insets.bottom, 12) }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.hello}>
            Oi, {me.name || 'você'}
            <Text style={[styles.hello, { color: colors.lime }]}>.</Text>
          </Text>
          <Tile onPress={() => router.push('/ajustes')} style={styles.round}>
            <Text style={{ fontSize: 18 }}>⚙</Text>
          </Tile>
        </View>

        <Appear>{hero}</Appear>
        {create.error ? (
          <Text variant="error" style={{ marginTop: 10 }}>
            {create.error}
          </Text>
        ) : null}

        <Appear delay={80} style={styles.row}>
          <Tile onPress={newGame} style={{ flex: 1 }}>
            <View style={styles.inline}>
              <Sticker kind="pin" color="#5AC8FA" size={40} tilt={-8} />
              <TileHead title="Criar" sub="nova partida" />
            </View>
          </Tile>
          <Tile onPress={() => router.push('/entrar')} style={{ flex: 1 }}>
            <View style={styles.inline}>
              <Sticker kind="qr" color={colors.lime} size={40} tilt={8} />
              <TileHead title="Entrar" sub="código ou QR" />
            </View>
          </Tile>
        </Appear>

        <Appear delay={140} style={styles.row}>
          <Tile onPress={() => router.replace('/crew')} style={{ flex: 1.15, minHeight: 200 }}>
            <TileHead title="Sua crew" sub={`${friends.length} ${friends.length === 1 ? 'amigo' : 'amigos'} · ${online.length} online`} />
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              {friends.slice(0, 4).map((f, i) => (
                <View key={f.id} style={{ marginLeft: i ? -10 : 0 }}>
                  <Avatar name={f.name} size={36} frame={f.frame} />
                </View>
              ))}
            </View>
            <Text style={styles.small}>{friends.length ? 'Chame pra próxima partida' : 'Adicione quem joga com você'}</Text>
            <View style={styles.crewFoot}>
              <ArrowPill label={friends.length ? 'Ver' : 'Adicionar'} bg={colors.lime} fg={BENTO.ink} onPress={() => router.replace('/crew')} />
              <Sticker kind="crew" color={colors.lime} size={46} tilt={8} />
            </View>
          </Tile>
          <View style={{ flex: 1, gap: 10 }}>
            <Tile onPress={() => router.replace('/loja')} style={{ flex: 1 }}>
              <TileHead title="Loja" sub="molduras" subColor="#FFC23D" />
              <View style={styles.corner}>
                <Sticker kind="bag" color={colors.pink} size={42} tilt={10} />
              </View>
            </Tile>
            <Tile onPress={() => router.replace('/perfil')} style={{ flex: 1 }}>
              <TileHead title="Medalhas" sub={`${won} de ${medals.length || 6}`} subColor="#B57CFF" />
              <View style={styles.corner}>
                <Sticker kind="cup" color="#FFC23D" size={42} tilt={-10} />
              </View>
            </Tile>
          </View>
        </Appear>

        <Appear delay={200} style={styles.row}>
          <Tile onPress={() => router.replace('/crew')} style={{ flex: 1 }}>
            <View style={styles.inline}>
              <Sticker kind="chat" color={colors.pink} size={40} tilt={-6} />
              <TileHead title="Me adiciona" sub={me.username ? `@${me.username}` : 'QR e @'} />
            </View>
          </Tile>
          <Tile onPress={() => router.replace('/perfil')} style={{ flex: 1 }}>
            <View style={styles.inline}>
              <Sticker kind="ghost" color="#B57CFF" size={40} tilt={8} />
              <TileHead title="Escondido" sub={profile?.stats.bestHiddenMs ? `${minutes(profile.stats.bestHiddenMs)} recorde` : 'sem recorde'} subColor="#B57CFF" />
            </View>
          </Tile>
        </Appear>

        <Text onPress={() => router.push('/treino')} style={[styles.small, { textAlign: 'center', marginTop: 18 }]}>
          Rodada de treino com bots
        </Text>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  hello: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.paper },
  round: { width: 44, height: 44, padding: 0, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 0.9, color: BENTO.ink, opacity: 0.7 },
  heroTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 31, letterSpacing: -0.9, color: BENTO.ink, marginTop: 6 },
  heroFoot: { position: 'absolute', left: 18, right: 18, bottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLink: { fontSize: 13, fontFamily: fonts.bodyStrong, color: BENTO.ink, opacity: 0.7, textDecorationLine: 'underline' },
  heroSticker: { position: 'absolute', right: 6, top: -26 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  corner: { position: 'absolute', right: 8, top: 10 },
  crewFoot: { marginTop: 'auto', paddingTop: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  small: { fontSize: 11, color: BENTO.muted, marginTop: 12 },
});
