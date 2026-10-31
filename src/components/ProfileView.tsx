import { useMutation } from 'convex/react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ArrowPill, BENTO, BentoBackground, BottomNav, Hero, NAV_SPACE, Sticker, Tile, TileHead, type StickerKind } from '@/components/Bento';
import { Button } from '@/components/Button';
import { Appear } from '@/components/Motion';
import { BackButton } from '@/components/Nav';
import { Text } from '@/components/Text';
import { useJoinGame } from '@/lib/game';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts } from '@/theme/tokens';
import { api } from '../../convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import type { Id } from '../../convex/_generated/dataModel';

export type Profile = NonNullable<FunctionReturnType<typeof api.friends.profile>>;

const MEDAL_ART: Record<string, [StickerKind, string]> = {
  fantasma: ['ghost', '#B57CFF'],
  chamas: ['hand', '#FF7828'],
  maratona: ['run', colors.lime],
  cacador: ['pin', colors.pink],
  escondido: ['ghost', '#5AC8FA'],
  veterano: ['cup', '#FFC23D'],
};
const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`);

// 20.3 Perfil (carteirinha): o meu (com a barra de baixo) ou o de outra pessoa
// (com voltar e os botões de amizade e de entrar na partida dela).
export function ProfileView({ p }: { p: Profile }) {
  const insets = useScreenInsets();
  const request = useMutation(api.friends.request);
  const respond = useMutation(api.friends.respond);
  const remove = useMutation(api.friends.remove);
  const join = useJoinGame();
  const s = p.stats;
  const lv = p.level;
  const won = p.medals.filter((m) => m.won).length;

  const enter = async (code: string) => {
    const r = await join(code);
    if (r.ok) router.push({ pathname: '/aguardando', params: { id: r.gameId } });
  };
  const uid = p.id as Id<'users'>;

  return (
    <View style={{ flex: 1, backgroundColor: BENTO.ink }}>
      <BentoBackground glow="rgba(255,42,85,0.18)" />
      <ScrollView
        contentContainerStyle={{ paddingTop: Math.max(insets.top, 20) + 14, paddingHorizontal: 16, paddingBottom: (p.isMe ? NAV_SPACE : 24) + Math.max(insets.bottom, 12) }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          {p.isMe ? <Text style={styles.title}>Perfil</Text> : <BackButton />}
          {p.isMe ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Tile onPress={() => router.push('/editar-perfil')} style={styles.chip}>
                <Text style={styles.chipText}>Editar</Text>
              </Tile>
              <Tile onPress={() => router.push('/ajustes')} style={[styles.chip, { width: 44, alignItems: 'center' }]}>
                <Text style={{ fontSize: 16 }}>⚙</Text>
              </Tile>
            </View>
          ) : null}
        </View>

        <Appear>
          <Hero from="#FF8A5A" to="#FF2A55" sticker={<View style={{ position: 'absolute', right: 4, top: -24 }}><Sticker kind="run" color={colors.lime} size={78} tilt={12} /></View>}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Avatar name={p.name} size={84} frame={p.frame} />
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>{`NÍVEL ${lv.level} · ${lv.name.toUpperCase()}`}</Text>
                <Text style={styles.heroName} numberOfLines={1} adjustsFontSizeToFit>
                  {p.name}
                </Text>
                {p.username ? <Text style={styles.handle}>@{p.username}</Text> : null}
              </View>
            </View>
            <View style={styles.xp}>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${Math.round((lv.into / lv.need) * 100)}%` }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={styles.xpText}>{`${lv.into} / ${lv.need} XP`}</Text>
                <Text style={styles.xpText}>{`próximo: ${lv.next}`}</Text>
              </View>
            </View>
          </Hero>
        </Appear>

        {!p.isMe && p.live ? (
          <Appear delay={60}>
            <Tile style={{ marginTop: 18, borderColor: colors.lime, backgroundColor: '#1E2A12' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.liveDot} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: fonts.bodyStrong }}>{p.live.status === 'lobby' ? `${p.name} está num lobby` : `${p.name} está jogando`}</Text>
                  <Text style={styles.small}>{`${p.live.code} · ${p.live.players} na partida`}</Text>
                </View>
                {p.live.status === 'lobby' ? <ArrowPill label="Entrar" bg={colors.lime} fg={BENTO.ink} onPress={() => enter(p.live!.code)} /> : null}
              </View>
            </Tile>
          </Appear>
        ) : null}

        <Appear delay={100} style={styles.row}>
          {[
            [String(s.games), 'partidas', colors.paper],
            [String(s.wins), 'vitórias', colors.lime],
            [String(s.catches), 'pegou', colors.pink],
          ].map(([v, l, c]) => (
            <Tile key={l} style={{ flex: 1 }}>
              <Text style={[styles.bigNum, { color: c }]}>{v}</Text>
              <Text style={styles.small}>{l}</Text>
            </Tile>
          ))}
        </Appear>

        <Appear delay={150} style={styles.row}>
          <Tile style={{ flex: 1 }}>
            <Sticker kind="ghost" color="#B57CFF" size={44} tilt={-8} />
            <View style={{ marginTop: 10 }}>
              <TileHead title={s.bestHiddenMs ? `${Math.round(s.bestHiddenMs / 60000)} min` : '–'} sub="mais escondido" subColor="#B57CFF" />
            </View>
          </Tile>
          <Tile style={{ flex: 1.25 }}>
            <TileHead title="Medalhas" sub={`${won} de ${p.medals.length}`} subColor="#FFC23D" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {p.medals.map((m) => {
                const [kind, color] = MEDAL_ART[m.id] ?? ['cup', '#FFC23D'];
                return (
                  <View key={m.id} style={{ opacity: m.won ? 1 : 0.25 }} accessible accessibilityLabel={`${m.name}: ${m.won ? 'conquistada' : m.hint}`}>
                    <Sticker kind={kind} color={m.won ? color : '#55606B'} size={34} tilt={m.won ? -6 : 0} />
                  </View>
                );
              })}
            </View>
            <Text style={[styles.small, { marginTop: 8 }]} numberOfLines={2}>
              {p.medals.find((m) => !m.won)?.hint ? `Próxima: ${p.medals.find((m) => !m.won)!.hint}` : 'Todas conquistadas!'}
            </Text>
          </Tile>
        </Appear>

        <Appear delay={200}>
          <Tile style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.small}>Distância somada</Text>
              <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong }}>{km(s.distanceM)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={styles.small}>Terminou livre</Text>
              <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong }}>{`${s.escapes}×`}</Text>
            </View>
            {!p.isMe && p.together !== null ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={styles.small}>Vocês jogaram juntos</Text>
                <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong }}>{`${p.together} ${p.together === 1 ? 'partida' : 'partidas'}`}</Text>
              </View>
            ) : null}
          </Tile>
        </Appear>

        {p.isMe ? (
          <Appear delay={240}>
            <Tile onPress={() => router.replace('/crew')} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Sticker kind="crew" color={colors.lime} size={40} tilt={-6} />
                <View style={{ flex: 1 }}>
                  <TileHead title={`${p.friends} ${p.friends === 1 ? 'amigo' : 'amigos'}`} sub="ver a crew" />
                </View>
                <ArrowPill label="Crew" bg={colors.lime} fg={BENTO.ink} onPress={() => router.replace('/crew')} />
              </View>
            </Tile>
          </Appear>
        ) : (
          <View style={{ marginTop: 18, gap: 4 }}>
            {p.status === 'none' ? <Button label="Adicionar como amigo" onPress={() => request({ userId: uid })} /> : null}
            {p.status === 'sent' ? <Button label="Pedido enviado" variant="secondary" disabled /> : null}
            {p.status === 'received' ? <Button label="Aceitar pedido de amizade" onPress={() => respond({ userId: uid, accept: true })} /> : null}
            {p.status === 'friend' || p.status === 'sent' ? (
              <Button variant="link" label={p.status === 'friend' ? 'Desfazer amizade' : 'Cancelar pedido'} onPress={() => remove({ userId: uid })} />
            ) : null}
          </View>
        )}
      </ScrollView>
      {p.isMe ? <BottomNav /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.paper },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14 },
  chipText: { fontSize: 13, fontFamily: fonts.bodyStrong },
  kicker: { fontSize: 11, fontFamily: fonts.bodyStrong, letterSpacing: 1, color: BENTO.ink, opacity: 0.7 },
  heroName: { fontFamily: fonts.display, fontSize: 32, lineHeight: 33, letterSpacing: -1, color: BENTO.ink, marginTop: 2 },
  handle: { fontSize: 13, fontFamily: fonts.bodyStrong, color: BENTO.ink, opacity: 0.7 },
  xp: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  xpTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(11,15,19,0.2)' },
  xpFill: { height: 10, borderRadius: 5, backgroundColor: BENTO.ink },
  xpText: { fontSize: 11, fontFamily: fonts.bodyStrong, color: BENTO.ink, opacity: 0.75 },
  row: { flexDirection: 'row', gap: 10, marginTop: 20 },
  bigNum: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -1 },
  small: { fontSize: 12, color: BENTO.muted, marginTop: 2 },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.lime, boxShadow: '0 0 0 6px rgba(200,242,60,0.2)' },
});
