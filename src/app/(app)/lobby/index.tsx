import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ChevronLeft } from '@/components/icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BENTO, Sticker, type StickerKind } from '@/components/Bento';
import { Button } from '@/components/Button';
import { GameMap } from '@/components/GameMap';
import { MapBackdrop } from '@/components/MapBackdrop';
import { Appear, Pressy, stagger } from '@/components/Motion';
import { OutlinedText } from '@/components/OutlinedText';
import type { Side } from '@/components/RoleTag';
import { Text } from '@/components/Text';
import { match, players as demoPlayers } from '@/lib/demo';
import { useFollowRound, useLobby } from '@/lib/game';
import { inviteLink } from '@/lib/qr';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts } from '@/theme/tokens';

// 23.10 Lobby do anfitrião: o código grande com contorno de figurinha e as
// figurinhas de QR, Compartilhar e Copiar; o mapinha da zona (toque para
// marcar ou editar), as regras em cartões e a crew com o lado de cada um.
// Com ?id= usa a partida real; sem, a demonstração.
export default function Lobby() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useScreenInsets();
  const lobby = useLobby(id);
  const [copied, setCopied] = useState(false);
  useFollowRound(id, lobby?.status);

  // Quem não é o anfitrião espera na outra tela.
  useEffect(() => {
    if (id && lobby && !lobby.isHost) router.replace({ pathname: '/aguardando', params: { id } });
  }, [id, lobby]);

  const code = lobby?.code ?? match.code;
  const rules = lobby?.rules ?? match.rules;
  const zone = lobby?.zone ?? null;
  const zoneMeters = lobby ? (zone ? zone.radius * 2 : null) : match.rules.zoneMeters;
  const withId = (pathname: string): Href => (id ? ({ pathname, params: { id } } as Href) : (pathname as Href));

  const people: { key: string; name: string; fullName: string; side: Side; ready: boolean; frame: string | null | undefined; photo?: number }[] = lobby
    ? lobby.players.map((p) => ({ key: p.id, name: p.isMe ? 'Você' : p.name, fullName: p.name, side: p.side, ready: p.ready || p.isHost, frame: p.frame, photo: undefined }))
    : demoPlayers.map((p) => ({ key: p.id, name: p.id === 'castro' ? 'Você' : p.name, fullName: p.name, side: p.role, ready: true, frame: null, photo: p.photo }));

  const share = () => Share.share({ message: `Bora jogar Pique? Entra com o código ${code} ou pelo link ${inviteLink(code)}` });
  const copy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  // Quem entrou e ainda não está pronto trava o começar.
  const choosing = lobby?.players.filter((p) => p.choosing).length ?? 0;
  // Linha 15: quem caça sai da roleta de luz, com todo mundo junto.
  const begin = () => (id ? router.push({ pathname: '/roda', params: { id } }) : router.push('/sorteio'));

  const count = (s: Side) => people.filter((p) => p.ready && p.side === s).length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const summary = [
    count('hunter') ? plural(count('hunter'), 'caçador', 'caçadores') : null,
    count('runner') ? plural(count('runner'), 'corredor', 'corredores') : null,
    count('draw') ? `${count('draw')} sorteio` : null,
    choosing ? `${choosing} entrando` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ flex: 1, backgroundColor: BENTO.ink }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top, 20) + 8, paddingHorizontal: 18, paddingBottom: Math.max(insets.bottom, 12) + 8 }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/sair', params: id ? { de: 'lobby', id } : { de: 'lobby' } })}
            hitSlop={8}
            style={styles.back}>
            <ChevronLeft size={20} color={colors.paper} strokeWidth={2.6} />
            <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 16 }}>Sair</Text>
          </Pressable>
          <View style={styles.host}>
            <Sticker kind="cup" color="#FFC23D" size={20} tilt={-8} />
            <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong }}>Você é o anfitrião</Text>
          </View>
        </View>

        <Appear style={{ alignItems: 'center', marginTop: 10 }}>
          <Text style={styles.kicker}>CÓDIGO DA PARTIDA</Text>
          <OutlinedText text={code} size={code.length > 6 ? 58 : 70} label={`Código da partida ${code.split('').join(' ')}`} />
        </Appear>
        <Appear delay={60} style={styles.actions}>
          <StickerAction kind="qr" color={colors.lime} tilt={-8} label="Mostrar QR" onPress={() => router.push(withId('/lobby/qr'))} />
          <StickerAction kind="chat" color={colors.pink} tilt={8} label="Compartilhar" onPress={share} />
          <StickerAction kind="copy" color="#5AC8FA" tilt={-6} label={copied ? 'Copiado!' : 'Copiar'} onPress={copy} />
        </Appear>

        <Appear delay={110}>
          <Pressy
            accessibilityRole="button"
            accessibilityLabel={zoneMeters ? `Zona de ${zoneMeters} metros. Editar no mapa` : 'Marcar a zona de jogo no mapa'}
            onPress={() => router.push(withId('/zona'))}
            scaleTo={0.98}
            style={[styles.map, { borderColor: zoneMeters ? colors.lime : '#2A333D' }]}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {zone ? (
                <GameMap
                  zone={zone}
                  nextZoneRadius={null}
                  people={[]}
                  now={0}
                  hunter={false}
                  outOfZone={false}
                  padding={{ top: 18, bottom: 18, left: 18, right: 18 }}
                />
              ) : (
                <MapBackdrop zone={zoneMeters ? { cx: 195, cy: 422, r: 82 } : undefined} dim={zoneMeters ? 0 : 0.45} fades={false} />
              )}
            </View>
            {zoneMeters ? (
              <>
                <View pointerEvents="none" style={styles.pin}>
                  <Sticker kind="pin" color={colors.pink} size={44} tilt={0} />
                </View>
                <View style={[styles.mapPill, { left: 12, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: BENTO.ink }]}>
                  <Text style={{ fontSize: 13, color: BENTO.ink, opacity: 0.6 }}>
                    Zona <Text style={{ fontSize: 15, fontFamily: fonts.display, color: BENTO.ink }}>{zoneMeters} m</Text>
                  </Text>
                </View>
                <View style={[styles.mapPill, { right: 12, backgroundColor: colors.paper }]}>
                  <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: BENTO.ink }}>Editar zona</Text>
                </View>
              </>
            ) : (
              <>
                <View pointerEvents="none" style={[styles.pin, { top: 26 }]}>
                  <Sticker kind="pin" color="#FFC23D" size={50} tilt={-8} />
                </View>
                <View style={styles.mark}>
                  <Text style={{ fontSize: 15, fontFamily: fonts.bodyStrong }}>Marcar a zona no mapa  →</Text>
                </View>
              </>
            )}
          </Pressy>
        </Appear>

        <Appear delay={150}>
          <View style={styles.section}>
            <Text style={styles.title}>Regras da casa</Text>
            <Text style={styles.side}>toque para mudar</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Rule href={withId('/lobby/regras')} label="Rodada" value={rules.durationMin} />
            <Rule href={withId('/lobby/regras')} label="Ping" value={rules.pingEveryMin} />
            <Rule href={withId('/lobby/regras')} label="Vantagem" value={rules.headStartMin} />
            <Rule href={withId('/lobby/regras')} label="Encolhe" value={rules.shrinkEveryMin} />
          </View>
        </Appear>

        <Pressable accessibilityRole="button" accessibilityLabel="Ver jogadores" onPress={() => router.push(withId('/lobby/jogadores'))}>
          <View style={styles.section}>
            <Text style={styles.title}>Jogadores</Text>
            <Text style={styles.side} numberOfLines={1}>
              {summary || `${rules.hunters} ${rules.hunters === 1 ? 'caçador' : 'caçadores'} na roleta`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 3 }}>
            {people.map((p, i) => (
              <Appear key={p.key} delay={stagger(i)} style={{ alignItems: 'center', width: 48 }}>
                <Avatar source={p.photo} name={p.fullName} size={44} state={p.ready ? p.side : 'draw'} frame={p.frame} />
                <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, marginTop: 5 }} numberOfLines={1}>{p.name}</Text>
                <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: !p.ready ? BENTO.muted : p.side === 'hunter' ? colors.pink : p.side === 'runner' ? colors.lime : BENTO.muted }}>
                  {!p.ready ? 'entrando' : p.side === 'hunter' ? 'caçador' : p.side === 'runner' ? 'corredor' : 'sorteio'}
                </Text>
              </Appear>
            ))}
            <Pressy accessibilityRole="button" accessibilityLabel="Chamar a crew" onPress={share} style={{ alignItems: 'center', width: 48 }}>
              <View style={styles.invite}>
                <Text style={{ fontSize: 22, color: BENTO.muted }}>+</Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, marginTop: 5, color: BENTO.muted }}>Chamar</Text>
            </Pressy>
          </View>
        </Pressable>

        <View style={{ flex: 1, minHeight: 20 }} />
        <Button
          label={
            lobby && people.length < 2
              ? 'Esperando a crew entrar…'
              : choosing > 0
                ? `Esperando ${choosing} ficar${choosing > 1 ? 'em' : ''} pronto${choosing > 1 ? 's' : ''}…`
                : 'Ir para a roleta'
          }
          disabled={!!lobby && (people.length < 2 || choosing > 0)}
          style={{ minHeight: 60, borderRadius: 24 }}
          onPress={begin}
        />
      </ScrollView>
    </View>
  );
}

// Figurinha com legenda (Mostrar QR, Compartilhar, Copiar).
function StickerAction({ kind, color, tilt, label, onPress }: { kind: StickerKind; color: string; tilt: number; label: string; onPress: () => void }) {
  return (
    <Pressy accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ alignItems: 'center', gap: 6, width: 96 }}>
      <Sticker kind={kind} color={color} size={46} tilt={tilt} />
      <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong }}>{label}</Text>
    </Pressy>
  );
}

function Rule({ href, label, value }: { href: Href; label: string; value: number }) {
  return (
    <Pressy accessibilityRole="button" accessibilityLabel={`${label} ${value} minutos. Editar`} onPress={() => router.push(href)} style={styles.rule}>
      <Text style={{ fontSize: 10, fontFamily: fonts.bodyStrong, color: BENTO.ink, opacity: 0.6 }}>{label}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 25, color: BENTO.ink }}>
        {value}
        <Text style={{ fontFamily: fonts.display, fontSize: 11, color: BENTO.ink }}> min</Text>
      </Text>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 44 },
  host: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BENTO.tile, borderRadius: 999, paddingVertical: 7, paddingLeft: 8, paddingRight: 12 },
  kicker: { fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 1, color: BENTO.muted, marginBottom: 2 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 6 },
  map: { height: 176, borderRadius: 24, borderWidth: 2, overflow: 'hidden', marginTop: 18, backgroundColor: colors.inkSunken },
  pin: { position: 'absolute', left: 0, right: 0, top: 58, alignItems: 'center' },
  mapPill: { position: 'absolute', top: 12, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  mark: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 50,
    borderRadius: 999,
    backgroundColor: colors.pink,
    borderWidth: 2,
    borderColor: BENTO.ink,
    boxShadow: '3px 4px 0 #0B0F13',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18, marginBottom: 10, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 18 },
  side: { fontSize: 12, fontFamily: fonts.bodyStrong, color: BENTO.muted, flexShrink: 1 },
  rule: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: BENTO.ink,
    borderRadius: 16,
    boxShadow: '2px 3px 0 #0B0F13',
    paddingVertical: 8,
    alignItems: 'center',
  },
  invite: { width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderStyle: 'dashed', borderColor: '#55606B', alignItems: 'center', justifyContent: 'center' },
});
