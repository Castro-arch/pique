import { useMutation } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Shuffle } from '@/components/icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarStack } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { BackButton } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { match, photos } from '@/lib/demo';
import { useLobby, type GameId } from '@/lib/game';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

type Side = 'runner' | 'hunter' | 'draw';
const confirmLabel: Record<Side, string> = { runner: 'corredor', hunter: 'caçador', draw: 'sorteio' };

// 4.6 Escolher lado
export default function Lado() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const lobby = useLobby(id);
  const save = useMutation(api.games.setSide);
  const [side, setSide] = useState<Side>('runner');
  const code = lobby?.code ?? match.code;
  const count = (s: Side) => lobby?.players.filter((p) => p.side === s).length ?? 0;
  const summary = lobby
    ? `${lobby.players.length} na partida · ${count('hunter')} caçadores · ${count('runner')} corredores · ${count('draw')} sorteio`
    : '6 na partida · 2 caçadores · 3 corredores · 1 sorteio';
  const confirm = async () => {
    if (id) await save({ gameId: id as GameId, side });
    router.replace({ pathname: '/aguardando', params: id ? { id, lado: side } : { lado: side } });
  };
  return (
    <Screen>
      <View style={styles.head}>
        <BackButton label="Lobby" onPress={() => router.replace(id ? { pathname: '/aguardando', params: { id } } : '/lobby')} />
        <Chip label={code} />
      </View>
      <Headline mark="?" style={{ marginTop: 14, fontSize: 34, lineHeight: 34 }}>De que lado você joga</Headline>
      <Text variant="small" style={{ marginTop: 8 }}>{summary}</Text>

      <View accessibilityRole="radiogroup" accessibilityLabel="Seu lado" style={{ gap: 10, marginTop: 16 }}>
        <BigCard
          on={side === 'runner'}
          onPress={() => setSide('runner')}
          role="runner"
          kicker="Corredor"
          title="Corra"
          body="Suma dentro da zona. Você só aparece nos pings."
          win="Vence se alguém estiver livre no fim"
          faces={lobby ? [] : [photos.priya, photos.sasha, photos.teo]}
        />
        <BigCard
          on={side === 'hunter'}
          onPress={() => setSide('hunter')}
          role="hunter"
          kicker="Caçador"
          tag={lobby ? undefined : 'falta 1 para equilibrar'}
          title="Você pega"
          body={`Sem rastreio ao vivo: um ping a cada ${match.rules.pingEveryMin} min.`}
          win="Vence pegando todos antes do tempo"
          faces={lobby ? [] : [photos.leo, photos.jonah]}
        />
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: side === 'draw' }}
          onPress={() => setSide('draw')}
          style={[styles.draw, side === 'draw' && { borderStyle: 'solid', borderColor: colors.paper }]}>
          <View style={styles.drawIcon}>
            <Shuffle size={20} color={colors.paper} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 15 }}>Sorteio</Text>
            <Text variant="small" style={{ marginTop: 2 }}>Completa o time que estiver menor</Text>
          </View>
          <Radio on={side === 'draw'} size={22} />
        </Pressable>
      </View>

      <Spacer />
      <Button label={`Confirmar: ${confirmLabel[side]}`} onPress={confirm} />
      <Text variant="label" style={{ textAlign: 'center', marginTop: 8 }}>Dá para trocar no lobby até a partida começar.</Text>
    </Screen>
  );
}

function Radio({ on, size = 26, ink = colors.limeInk, accent = colors.lime }: { on: boolean; size?: number; ink?: string; accent?: string }) {
  return on ? (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: ink, alignItems: 'center', justifyContent: 'center' }}>
      <Check size={14} color={accent} strokeWidth={3.2} />
    </View>
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.inkMuted }} />
  );
}

function BigCard(p: {
  on: boolean;
  onPress: () => void;
  role: 'runner' | 'hunter';
  kicker: string;
  tag?: string;
  title: string;
  body: string;
  win: string;
  faces: number[];
}) {
  const runner = p.role === 'runner';
  const accent = runner ? colors.lime : colors.pink;
  const solid = p.on ? accent : colors.inkRaised;
  const fg = p.on ? (runner ? colors.limeInk : colors.paper) : colors.paper;
  const sub = p.on ? fg : colors.paperMuted;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: p.on }}
      accessibilityLabel={`${p.kicker}. ${p.body} ${p.win}`}
      onPress={p.onPress}
      style={[styles.card, { backgroundColor: solid }, !p.on && { borderWidth: 1, borderColor: colors.inkBorder }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={
              runner
                ? { width: 12, height: 12, borderRadius: 6, backgroundColor: p.on ? colors.limeInk : colors.lime }
                : { width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: p.on ? colors.paper : colors.pink }
            }
          />
          <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 13, color: p.on ? fg : accent }}>{p.kicker}</Text>
          {p.tag ? <Chip label={p.tag} tone="hunter" style={{ paddingVertical: 3 }} /> : null}
        </View>
        <Radio on={p.on} ink={runner ? colors.limeInk : colors.paper} accent={accent} />
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: 42, lineHeight: 42, letterSpacing: -2, marginTop: 6, color: fg }}>
        {p.title}
        <Text style={{ fontFamily: fonts.display, fontSize: 42, color: p.on ? colors.paper : accent }}>.</Text>
      </Text>
      <Text style={{ fontSize: 14, lineHeight: 20, marginTop: 6, color: sub, maxWidth: 270 }}>{p.body}</Text>
      <View style={[styles.cardFoot, { borderTopColor: p.on ? 'rgba(22,32,10,0.25)' : colors.inkBorder }]}>
        <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, color: sub }}>{p.win}</Text>
        {p.faces.length ? <AvatarStack sources={p.faces} size={26} ring={accent} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  card: { borderRadius: radius.xxl, paddingVertical: 16, paddingHorizontal: 18 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  draw: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.inkMuted,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  drawIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.inkRaised, alignItems: 'center', justifyContent: 'center' },
});
