import { useMutation } from 'convex/react';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ChevronLeft, QrCode } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { SidePicker, type Side } from '@/components/RoleTag';
import { Screen, Spacer } from '@/components/Screen';
import { Text } from '@/components/Text';
import { match, players as demoPlayers } from '@/lib/demo';
import { errorInfo, useFollowRound, useLobby, type GameId } from '@/lib/game';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../../convex/_generated/api';

const roleWord = { runner: 'corredor', hunter: 'caçador', draw: 'sorteio' } as const;

// 5.1 Lobby do anfitrião. Com ?id= usa a partida real; sem, a demonstração.
export default function Lobby() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const lobby = useLobby(id);
  const saveSide = useMutation(api.games.setSide);
  const start = useMutation(api.rounds.start);
  const [demoSide, setDemoSide] = useState<Side>('runner');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useFollowRound(id, lobby?.status);

  // Quem não é o anfitrião espera na outra tela.
  useEffect(() => {
    if (id && lobby && !lobby.isHost) router.replace({ pathname: '/aguardando', params: { id } });
  }, [id, lobby]);

  const code = lobby?.code ?? match.code;
  const rules = lobby?.rules ?? match.rules;
  const zoneMeters = lobby ? (lobby.zone ? lobby.zone.radius * 2 : null) : match.rules.zoneMeters;
  const side = lobby?.me.side ?? demoSide;
  const setSide = (s: Side) => (id ? saveSide({ gameId: id as GameId, side: s }) : setDemoSide(s));
  const withId = (pathname: string): Href => (id ? ({ pathname, params: { id } } as Href) : (pathname as Href));

  const people = lobby
    ? lobby.players.map((p) => ({ key: p.id, name: p.isMe ? 'Você' : p.name, fullName: p.name, side: p.side, photo: undefined }))
    : demoPlayers.map((p) => ({ key: p.id, name: p.id === 'castro' ? 'Você' : p.name, fullName: p.name, side: p.id === 'castro' ? demoSide : p.role, photo: p.photo }));
  const count = (s: Side) => people.filter((p) => p.side === s).length;

  const share = () => Share.share({ message: `Bora jogar Pique? Entra com o código ${code} ou pelo link https://pique.app/p/${code}` });
  const copy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const begin = async () => {
    if (!id) return router.push('/sorteio');
    setError(null);
    setStarting(true);
    try {
      await start({ gameId: id as GameId });
    } catch (e) {
      setError(errorInfo(e).message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/sair', params: id ? { de: 'lobby', id } : { de: 'lobby' } })}
          style={styles.back}>
          <ChevronLeft size={20} color={colors.lime} strokeWidth={2.4} />
          <Text style={{ color: colors.lime, fontFamily: fonts.bodyMedium, fontSize: 15 }}>Sair</Text>
        </Pressable>
        <Text variant="small">Você é o anfitrião</Text>
      </View>

      <View style={styles.code}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 0.5, color: colors.limeInk }}>CÓDIGO DA PARTIDA</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Mostrar QR" onPress={() => router.push(withId('/lobby/qr'))} hitSlop={10} style={styles.qrBtn}>
            <QrCode size={16} color={colors.limeInk} />
            <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.limeInk }}>Mostrar QR</Text>
          </Pressable>
        </View>
        <Text style={styles.codeText}>{code}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Pressable accessibilityRole="button" onPress={share} style={[styles.pill, { flex: 1, backgroundColor: colors.limeInk }]}>
            <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 14 }}>Compartilhar</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={copy} style={[styles.pill, { borderWidth: 1.5, borderColor: colors.limeInk, paddingHorizontal: 18 }]}>
            <Text style={{ color: colors.limeInk, fontFamily: fonts.bodyStrong, fontSize: 14 }}>{copied ? 'Copiado' : 'Copiar'}</Text>
          </Pressable>
        </View>
      </View>

      <Text variant="small" style={styles.label}>Regras da casa · começam no padrão mais jogado</Text>
      <View style={styles.grid}>
        <Rule href={withId('/lobby/regras')} label="Rodada" value={rules.durationMin} unit="min" />
        <Rule href={withId('/lobby/regras')} label="Ping a cada" value={rules.pingEveryMin} unit="min" />
        <Rule href={withId('/lobby/regras')} label="Vantagem" value={rules.headStartMin} unit="min" />
        <Rule href={withId('/zona')} label="Zona" value={zoneMeters ?? '–'} unit={zoneMeters ? 'm' : ''} />
        <Rule href={withId('/lobby/regras')} label="Encolhe a cada" value={rules.shrinkEveryMin} unit="min" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={zoneMeters ? 'Zona de jogo marcada. Editar no mapa' : 'Marcar a zona de jogo no mapa'}
          onPress={() => router.push(withId('/zona'))}
          style={[styles.rule, zoneMeters ? { backgroundColor: colors.limeTint, borderColor: colors.lime } : { borderColor: colors.amber }]}>
          <Text style={{ fontSize: 11, color: zoneMeters ? colors.lime : colors.amber }}>Zona de jogo</Text>
          <Text style={[styles.ruleValue, { color: zoneMeters ? colors.lime : colors.amber }]}>{zoneMeters ? 'Ligada' : 'Marcar'}</Text>
        </Pressable>
      </View>
      <Text variant="label" style={{ marginTop: 8 }}>
        {zoneMeters ? `A zona encolhe de ${zoneMeters} m para 150 m depois da vantagem.` : 'Marque a zona no mapa antes de começar.'}
      </Text>

      <Text variant="small" style={styles.label}>Você joga como</Text>
      <SidePicker value={side} onChange={setSide} />

      <Pressable accessibilityRole="button" accessibilityLabel="Ver jogadores" onPress={() => router.push(withId('/lobby/jogadores'))}>
        <View style={[styles.label, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }]}>
          <Text variant="small">Jogadores</Text>
          <Text variant="label">{`${count('hunter')} caçadores · ${count('runner')} corredores · ${count('draw')} sorteio`}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {people.map((p) => (
            <View key={p.key} style={{ alignItems: 'center', width: 52 }}>
              <Avatar source={p.photo} name={p.fullName} size={42} state={p.side === 'draw' ? 'draw' : p.side} />
              <Text style={{ fontSize: 11, marginTop: 4 }} numberOfLines={1}>{p.name}</Text>
              <Text style={{ fontSize: 10, color: p.side === 'runner' ? colors.lime : p.side === 'hunter' ? colors.pink : colors.paperMuted }}>
                {roleWord[p.side]}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>

      <Spacer />
      {error ? <Text variant="error" style={{ marginTop: 16 }}>{error}</Text> : null}
      <Button
        label={lobby && people.length < 2 ? 'Esperando a crew entrar…' : 'Começar partida'}
        disabled={!!lobby && people.length < 2}
        loading={starting}
        style={{ marginTop: 20 }}
        onPress={begin}
      />
    </Screen>
  );
}

function Rule({ href, label, value, unit }: { href: Href; label: string; value: number | string; unit: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${value} ${unit}. Editar`} onPress={() => router.push(href)} style={styles.rule}>
      <Text style={{ fontSize: 11, color: colors.paperMuted }}>{label}</Text>
      <Text style={styles.ruleValue}>
        {value}
        <Text style={{ fontFamily: fonts.display, fontSize: 13 }}> {unit}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 44 },
  code: { backgroundColor: colors.lime, borderRadius: radius.xl, paddingVertical: 14, paddingHorizontal: 18, marginTop: 12 },
  codeText: { fontFamily: fonts.display, fontSize: 56, lineHeight: 60, letterSpacing: -1.6, color: colors.limeInk, marginTop: 2 },
  qrBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 16, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rule: {
    width: '31.6%',
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ruleValue: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
});
