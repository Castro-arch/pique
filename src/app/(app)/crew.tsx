import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Avatar } from '@/components/Avatar';
import { ArrowPill, BENTO, BentoBackground, BottomNav, Hero, NAV_SPACE, Sticker, Tile, TileHead } from '@/components/Bento';
import { Button } from '@/components/Button';
import { Appear, SlideUp, stagger } from '@/components/Motion';
import { Text } from '@/components/Text';
import { useDemoMode } from '@/lib/demoMode';
import { useJoinGame } from '@/lib/game';
import { inviteLink, profileLink } from '@/lib/qr';
import { useScreenInsets } from '@/lib/screenInsets';
import { useMe } from '@/lib/useMe';
import { colors, fonts } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

// 20.4 Crew: QR e @ para adicionar, quem está jogando agora, pedidos e a lista.
export default function Crew() {
  const me = useMe();
  const demo = useDemoMode();
  const insets = useScreenInsets();
  const data = useQuery(api.friends.list, demo ? 'skip' : {});
  const mine = useQuery(api.games.mine, demo ? 'skip' : {});
  const respond = useMutation(api.friends.respond);
  const join = useJoinGame();
  const [qr, setQr] = useState(false);
  const [handle, setHandle] = useState('');
  const found = useQuery(api.friends.find, !demo && handle.trim().replace(/^@/, '').length >= 3 ? { username: handle } : 'skip');
  const request = useMutation(api.friends.request);

  const friends = data?.friends ?? [];
  const live = friends.filter((f) => f.live);
  const rest = friends.filter((f) => !f.live);
  const myLobby = mine?.find((g) => g.status === 'lobby');

  const enter = async (code: string) => {
    const r = await join(code);
    if (r.ok) router.push({ pathname: '/aguardando', params: { id: r.gameId } });
  };
  // "Chamar": com partida aberta manda o convite dela; sem, o meu perfil.
  const call = (name: string) =>
    Share.share({
      message: myLobby
        ? `${name}, bora jogar Pique? Entra na minha partida: ${inviteLink(myLobby.code)}`
        : `${name}, me adiciona no Pique: ${profileLink(me.username)}`,
    });

  return (
    <View style={{ flex: 1, backgroundColor: BENTO.ink }}>
      <BentoBackground />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: Math.max(insets.top, 20) + 14, paddingHorizontal: 16, paddingBottom: NAV_SPACE + Math.max(insets.bottom, 12) }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.title}>
            Crew<Text style={[styles.title, { color: colors.lime }]}>.</Text>
          </Text>
          {data?.incoming.length ? (
            <View style={styles.badgeChip}>
              <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong }}>Pedidos</Text>
              <View style={styles.badge}>
                <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: BENTO.ink }}>{data.incoming.length}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <Appear>
          <Hero from="#E6FF5A" to="#86D63C" sticker={<View style={{ position: 'absolute', right: 8, top: -22 }}><Sticker kind="qr" color={colors.lime} size={86} tilt={12} /></View>}>
            <Text style={styles.kicker}>CHAME A GALERA</Text>
            <Text style={styles.heroTitle}>{'Mostra o QR\ne já era'}</Text>
            <View style={{ position: 'absolute', left: 18, right: 18, bottom: 16, flexDirection: 'row', gap: 8 }}>
              <ArrowPill label="Meu QR" onPress={() => setQr(true)} />
              <Pressable onPress={() => Share.share({ message: `Me adiciona no Pique: ${profileLink(me.username)}` })} style={styles.handlePill}>
                <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong, color: BENTO.ink }}>@{me.username || 'você'}</Text>
              </Pressable>
            </View>
          </Hero>
        </Appear>

        {/* Procurar pelo @ */}
        <Appear delay={60}>
          <View style={styles.search}>
            <Text style={{ fontSize: 16, fontFamily: fonts.bodyStrong, color: colors.lime }}>@</Text>
            <TextInput
              value={handle}
              onChangeText={setHandle}
              placeholder="procurar pelo nome de usuário"
              placeholderTextColor={BENTO.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>
          {found ? (
            <Tile style={{ marginTop: 8 }}>
              <View style={styles.rowItem}>
                <Avatar name={found.name} size={44} frame={found.frame} />
                <Pressable style={{ flex: 1 }} onPress={() => found.username && router.push({ pathname: '/u/[username]', params: { username: found.username } })}>
                  <Text style={styles.name}>{found.name}</Text>
                  <Text style={styles.small}>@{found.username}</Text>
                </Pressable>
                {found.isMe ? (
                  <Text style={styles.small}>é você</Text>
                ) : found.status === 'none' ? (
                  <ArrowPill label="Adicionar" bg={colors.lime} fg={BENTO.ink} onPress={() => request({ userId: found.id as Id<'users'> })} />
                ) : (
                  <Text style={[styles.small, { color: colors.lime }]}>{found.status === 'friend' ? 'amigos' : found.status === 'sent' ? 'pedido enviado' : 'te pediu'}</Text>
                )}
              </View>
            </Tile>
          ) : handle.trim().length >= 3 && found === null ? (
            <Text style={[styles.small, { marginTop: 8 }]}>Ninguém com esse @.</Text>
          ) : null}
        </Appear>

        {data?.incoming.length ? (
          <>
            <Text style={styles.label}>PEDIDOS PARA VOCÊ</Text>
            {data.incoming.map((r) => (
              <Tile key={r.id} style={{ marginTop: 8 }}>
                <View style={styles.rowItem}>
                  <Avatar name={r.name} size={44} frame={r.frame} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{r.name}</Text>
                    <Text style={styles.small}>quer ser seu amigo</Text>
                  </View>
                  <Pressable accessibilityLabel="Aceitar" onPress={() => respond({ userId: r.id as Id<'users'>, accept: true })} style={[styles.round, { backgroundColor: colors.lime }]}>
                    <Text style={{ fontSize: 16, color: BENTO.ink, fontFamily: fonts.bodyStrong }}>✓</Text>
                  </Pressable>
                  <Pressable accessibilityLabel="Recusar" onPress={() => respond({ userId: r.id as Id<'users'>, accept: false })} style={[styles.round, { borderWidth: 1, borderColor: BENTO.line }]}>
                    <Text style={{ fontSize: 16, color: BENTO.muted }}>×</Text>
                  </Pressable>
                </View>
              </Tile>
            ))}
          </>
        ) : null}

        {live.length ? (
          <>
            <Text style={styles.label}>JOGANDO AGORA</Text>
            <View style={styles.grid}>
              {live.map((f, i) => (
                <Appear key={f.id} delay={stagger(i)} style={styles.cell}>
                  <Tile onPress={() => f.username && router.push({ pathname: '/u/[username]', params: { username: f.username } })}>
                    <View style={styles.rowItem}>
                      <Avatar name={f.name} size={48} frame={f.frame} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name} numberOfLines={1}>
                          {f.name}
                        </Text>
                        <Text style={[styles.small, { color: f.live!.status === 'lobby' ? colors.lime : '#FF8FA8' }]}>
                          ● {f.live!.status === 'lobby' ? `lobby · ${f.live!.players}` : 'jogando'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ marginTop: 12 }}>
                      {f.live!.status === 'lobby' ? (
                        <ArrowPill label="Entrar" bg={colors.lime} fg={BENTO.ink} onPress={() => enter(f.live!.code)} />
                      ) : (
                        <ArrowPill label="Ver" bg={BENTO.line} onPress={() => f.username && router.push({ pathname: '/u/[username]', params: { username: f.username } })} />
                      )}
                    </View>
                  </Tile>
                </Appear>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>{friends.length ? 'TODOS' : 'SUA CREW'}</Text>
        {friends.length === 0 ? (
          <Tile style={{ marginTop: 8 }}>
            <View style={styles.rowItem}>
              <Sticker kind="crew" color={colors.lime} size={44} tilt={-6} />
              <View style={{ flex: 1 }}>
                <TileHead title="Ninguém ainda" sub="mostre seu QR ou procure pelo @" />
              </View>
            </View>
          </Tile>
        ) : (
          <Tile style={{ marginTop: 8, paddingVertical: 4 }}>
            {(rest.length ? rest : friends).map((f, i) => (
              <View key={f.id} style={[styles.rowItem, { paddingVertical: 8 }, i ? { borderTopWidth: 1, borderTopColor: BENTO.line } : null]}>
                <Pressable style={[styles.rowItem, { flex: 1 }]} onPress={() => f.username && router.push({ pathname: '/u/[username]', params: { username: f.username } })}>
                  <Avatar name={f.name} size={40} frame={f.frame} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{f.name}</Text>
                    <Text style={styles.small}>{f.together ? `${f.together} ${f.together === 1 ? 'partida junto' : 'partidas juntos'}` : 'ainda não jogaram juntos'}</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => call(f.name)} style={styles.call}>
                  <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong }}>Chamar</Text>
                </Pressable>
              </View>
            ))}
          </Tile>
        )}
      </ScrollView>
      <BottomNav />

      {qr ? (
        <Modal transparent animationType="fade" onRequestClose={() => setQr(false)}>
          <View style={styles.backdrop}>
            <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => setQr(false)} />
            <SlideUp>
              <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
                <View style={styles.qrCard}>
                  <View style={styles.rowItem}>
                    <Avatar name={me.name || '?'} size={48} />
                    <View>
                      <Text style={[styles.name, { color: BENTO.ink, fontSize: 20 }]}>{me.name}</Text>
                      <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: BENTO.ink, opacity: 0.7 }}>@{me.username}</Text>
                    </View>
                  </View>
                  <View style={styles.qrBox}>{me.username ? <QRCode value={profileLink(me.username)} size={190} backgroundColor="#F3F0E8" color={BENTO.ink} /> : null}</View>
                  <Text style={{ textAlign: 'center', fontSize: 13, fontFamily: fonts.bodyStrong, color: BENTO.ink, marginTop: 12 }}>
                    Escaneia com a câmera e já abre o meu perfil
                  </Text>
                </View>
                <Button label="Mandar meu link" style={{ marginTop: 14 }} onPress={() => Share.share({ message: `Me adiciona no Pique: ${profileLink(me.username)}` })} />
                <Button label="Fechar" variant="link" onPress={() => setQr(false)} />
              </View>
            </SlideUp>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.paper },
  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BENTO.tile, borderWidth: 1, borderColor: BENTO.line, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
  badge: { backgroundColor: colors.pink, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  kicker: { fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 0.9, color: BENTO.ink, opacity: 0.7 },
  heroTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 31, letterSpacing: -0.9, color: BENTO.ink, marginTop: 6 },
  handlePill: { backgroundColor: 'rgba(11,15,19,0.16)', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, height: 52, borderRadius: 18, backgroundColor: BENTO.tile, borderWidth: 1, borderColor: BENTO.line, paddingHorizontal: 16 },
  input: { flex: 1, color: colors.paper, fontSize: 15, fontFamily: fonts.body, height: 50 },
  label: { fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 0.9, color: BENTO.muted, marginTop: 22 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 15, fontFamily: fonts.bodyStrong, color: colors.paper },
  small: { fontSize: 12, color: BENTO.muted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 10 },
  cell: { width: '48.5%' },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  call: { backgroundColor: BENTO.line, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: BENTO.tile, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: BENTO.line, padding: 20 },
  qrCard: { backgroundColor: colors.lime, borderRadius: 28, padding: 20 },
  qrBox: { alignSelf: 'center', marginTop: 16, padding: 12, borderRadius: 22, backgroundColor: '#F3F0E8' },
});
