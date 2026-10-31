import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Mic, Pause, Play } from '@/components/icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { GameTabs, mmss, useDock } from '@/components/Game';
import { Appear, stagger } from '@/components/Motion';
import { Text } from '@/components/Text';
import { photos } from '@/lib/demo';
import { errorInfo, secondsUntil, useNow, useView, type GameId } from '@/lib/game';
import { useTalk } from '@/lib/radioAudio';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

type Msg =
  | { kind: 'system'; at: string; text: string }
  | { kind: 'text'; name: string; mine: boolean; text: string; playerId?: string }
  | { kind: 'audio'; name: string; mine: boolean; seconds: number; playerId?: string; url?: string | null };

// Respostas prontas: sem texto livre no Radio (decisão de produto).
const demoQuick = ['Achei um!', 'Cubram o canal', 'Onde você está?', 'Tô indo', 'Perdi de vista'];

const initial: Msg[] = [
  { kind: 'system', at: '33:00', text: 'Os corredores têm 3 min de vantagem. Segurem firme.' },
  { kind: 'audio', name: 'Leo', mine: false, seconds: 6 },
  { kind: 'text', name: 'Leo', mine: false, text: 'Vou pegar o campinho, você pega a rua Figueira.' },
  { kind: 'text', name: 'Você', mine: true, text: 'Fechado' },
  { kind: 'system', at: '29:56', text: 'Os corredores se espalharam. Vão atrás.' },
];

// 7.2 Radio do time: respostas prontas + áudio de segurar para falar.
// Os áudios ficam no armazenamento do Convex e são apagados no fim da partida.
export default function Radio() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { dock } = useDock();
  const live = useQuery(api.radio.list, id ? { gameId: id as GameId } : 'skip');
  const view = useView(id);
  const now = useNow();
  const sendQuick = useMutation(api.radio.sendQuick);
  const talk = useTalk(id);
  const [demoMsgs, setDemoMsgs] = useState<Msg[]>(initial);
  const [talking, setTalking] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const endsAt = view?.game.status === 'headstart' ? view.game.headStartEndsAt : view?.game.endsAt;
  const clock = id ? mmss(secondsUntil(endsAt, now)) : '30:45';
  const channel = id ? (live?.team === 'hunter' ? 'Canal dos caçadores' : 'Canal dos corredores') : 'Canal dos caçadores · 2 no ar';
  const quick: readonly string[] = live?.quick ?? demoQuick;

  // Mensagens do servidor no mesmo formato dos balões da demonstração.
  const msgs: Msg[] = id
    ? (live?.messages ?? []).map((m) => {
        if (m.kind === 'system' || !m.from) {
          const left = endsAt ? Math.max(0, Math.round((endsAt - m.at) / 1000)) : 0;
          return { kind: 'system', at: mmss(left), text: m.text ?? '' };
        }
        const base = { name: m.from.name, mine: m.from.isMe, playerId: m.from.id };
        return m.kind === 'audio'
          ? { kind: 'audio', ...base, seconds: m.seconds ?? 0, url: m.audioUrl }
          : { kind: 'text', ...base, text: m.text ?? '' };
      })
    : demoMsgs;

  const send = async (text: string) => {
    if (!id) return setDemoMsgs((x) => [...x, { kind: 'text', name: 'Você', mine: true, text }]);
    setError(null);
    try {
      await sendQuick({ gameId: id as GameId, text });
    } catch (e) {
      setError(errorInfo(e).message);
    }
  };
  const holdStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (id) return void talk.start();
    setTalking(true);
    setStartedAt(Date.now());
  };
  const holdEnd = () => {
    if (id) return void talk.stop();
    if (!talking) return;
    setTalking(false);
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    setDemoMsgs((x) => [...x, { kind: 'audio', name: 'Você', mine: true, seconds }]);
  };
  const isTalking = id ? talk.recording : talking;

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 56) }]}>
      <View style={styles.head}>
        <View>
          <Text variant="h2" accessibilityRole="header">Radio</Text>
          <Text variant="small" style={{ marginTop: 2 }}>{channel}</Text>
        </View>
        <Text style={{ fontFamily: fonts.display, fontSize: 22 }}>{clock}</Text>
      </View>

      <ScrollView style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 12 }}>
        <Text variant="label" style={{ textAlign: 'center' }}>Segure uma mensagem para denunciar ou bloquear quem enviou.</Text>
        {msgs.map((m, i) => (
          <Appear key={i} delay={stagger(i, 30)}>
            <Bubble m={m} />
          </Appear>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingBottom: dock + 72 }}>
        {error || talk.error ? <Text variant="error" style={{ marginBottom: 8 }}>{error ?? talk.error}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {quick.map((q) => (
            <Pressable key={q} accessibilityRole="button" onPress={() => send(q)} style={styles.quick}>
              <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong }}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Segure para falar com o time"
          onPressIn={holdStart}
          onPressOut={holdEnd}
          style={[styles.talk, isTalking && { backgroundColor: colors.pink }]}>
          <Mic size={20} color={isTalking ? colors.paper : colors.limeInk} />
          <Text style={{ fontSize: 15, fontFamily: fonts.bodyStrong, color: isTalking ? colors.paper : colors.limeInk }}>
            {isTalking ? 'Gravando… solte para enviar' : talk.sending ? 'Enviando…' : 'Segure para falar'}
          </Text>
        </Pressable>
      </View>

      <GameTabs tab="radio" bottom={dock} />
    </View>
  );
}

function Bubble({ m }: { m: Msg }) {
  if (m.kind === 'system') {
    return (
      <View style={styles.system}>
        <Text variant="small" style={{ textAlign: 'center' }}>
          <Text style={{ fontFamily: fonts.bodyStrong, color: colors.paper, fontSize: 13 }}>{m.at}</Text> · {m.text}
        </Text>
      </View>
    );
  }
  const body =
    m.kind === 'text' ? (
      <Text style={{ fontSize: 15, lineHeight: 20 }}>{m.text}</Text>
    ) : m.url ? (
      <AudioBody url={m.url} seconds={m.seconds} />
    ) : (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={styles.play}>
          <Play size={14} color={colors.paper} fill={colors.paper} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          {Array.from({ length: 18 }, (_, i) => (
            <View key={i} style={{ width: 3, borderRadius: 2, height: 6 + ((i * 7) % 16), backgroundColor: colors.paperMuted }} />
          ))}
        </View>
        <Text variant="label">0:{String(m.seconds).padStart(2, '0')}</Text>
      </View>
    );
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
      {!m.mine ? <Avatar source={m.playerId ? undefined : photos.leo} name={m.name} size={32} state="hunter" /> : null}
      <Pressable
        accessibilityRole="text"
        delayLongPress={400}
        onLongPress={() => !m.mine && !m.playerId && router.push({ pathname: '/denunciar', params: { id: 'leo' } })}
        style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}>
        {!m.mine ? <Text style={{ fontSize: 12, color: colors.paperMuted, marginBottom: 2 }}>{m.name}</Text> : null}
        {body}
      </Pressable>
    </View>
  );
}

// Áudio de verdade do Radio: toque para ouvir, a onda acende conforme toca.
function AudioBody({ url, seconds }: { url: string; seconds: number }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const progress = status.duration ? status.currentTime / status.duration : 0;
  const toggle = () => {
    if (status.playing) return player.pause();
    if (status.didJustFinish || progress >= 0.99) player.seekTo(0);
    player.play();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pausar áudio' : `Ouvir áudio de ${seconds} segundos`}
      onPress={toggle}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={[styles.play, status.playing && { backgroundColor: colors.lime }]}>
        {status.playing ? <Pause size={14} color={colors.limeInk} fill={colors.limeInk} /> : <Play size={14} color={colors.paper} fill={colors.paper} />}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {Array.from({ length: 18 }, (_, i) => (
          <View
            key={i}
            style={{ width: 3, borderRadius: 2, height: 6 + ((i * 7) % 16), backgroundColor: i / 18 < progress ? colors.lime : colors.paperMuted }}
          />
        ))}
      </View>
      <Text variant="label">0:{String(seconds).padStart(2, '0')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20 },
  system: { alignSelf: 'center', backgroundColor: colors.inkSunken, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12 },
  bubble: { flexShrink: 1, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 14 },
  // Balões neutros, sem cor de papel (pedido do design).
  theirs: { backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderTopLeftRadius: 6 },
  mine: { backgroundColor: colors.inkBorder, borderTopRightRadius: 6 },
  play: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.inkMuted, alignItems: 'center', justifyContent: 'center' },
  quick: { height: 40, borderRadius: 999, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder },
  talk: {
    marginTop: 10,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.lime,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
