import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Mic, Play } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { GameTabs } from '@/components/Game';
import { Text } from '@/components/Text';
import { photos } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

type Msg =
  | { kind: 'system'; at: string; text: string }
  | { kind: 'text'; from: 'leo' | 'me'; text: string }
  | { kind: 'audio'; from: 'leo' | 'me'; seconds: number };

// Respostas prontas: sem texto livre no Radio (decisão de produto).
const quick = ['Achei um!', 'Cubram o canal', 'Onde você está?', 'Tô indo', 'Perdi de vista'];

const initial: Msg[] = [
  { kind: 'system', at: '33:00', text: 'Os corredores têm 3 min de vantagem. Segurem firme.' },
  { kind: 'audio', from: 'leo', seconds: 6 },
  { kind: 'text', from: 'leo', text: 'Vou pegar o campinho, você pega a rua Figueira.' },
  { kind: 'text', from: 'me', text: 'Fechado' },
  { kind: 'system', at: '29:56', text: 'Os corredores se espalharam. Vão atrás.' },
];

// 7.2 Radio do time: respostas prontas + áudio de segurar para falar.
// Os áudios ficam no armazenamento do Convex e são apagados no fim da partida.
export default function Radio() {
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [talking, setTalking] = useState(false);
  const [startedAt, setStartedAt] = useState(0);

  const send = (m: Msg) => setMsgs((x) => [...x, m]);
  const holdStart = () => {
    setTalking(true);
    setStartedAt(Date.now());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };
  const holdEnd = () => {
    if (!talking) return;
    setTalking(false);
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    send({ kind: 'audio', from: 'me', seconds });
  };

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 56) }]}>
      <View style={styles.head}>
        <View>
          <Text variant="h2" accessibilityRole="header">Radio</Text>
          <Text variant="small" style={{ marginTop: 2 }}>Canal dos caçadores · 2 no ar</Text>
        </View>
        <Text style={{ fontFamily: fonts.display, fontSize: 22 }}>30:45</Text>
      </View>

      <ScrollView style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 12 }}>
        <Text variant="label" style={{ textAlign: 'center' }}>Segure uma mensagem para denunciar ou bloquear quem enviou.</Text>
        {msgs.map((m, i) => (
          <Bubble key={i} m={m} />
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 34) + 72 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {quick.map((q) => (
            <Pressable key={q} accessibilityRole="button" onPress={() => send({ kind: 'text', from: 'me', text: q })} style={styles.quick}>
              <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong }}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Segure para falar com o time"
          onPressIn={holdStart}
          onPressOut={holdEnd}
          style={[styles.talk, talking && { backgroundColor: colors.pink }]}>
          <Mic size={20} color={talking ? colors.paper : colors.limeInk} />
          <Text style={{ fontSize: 15, fontFamily: fonts.bodyStrong, color: talking ? colors.paper : colors.limeInk }}>
            {talking ? 'Gravando… solte para enviar' : 'Segure para falar'}
          </Text>
        </Pressable>
      </View>

      <GameTabs tab="radio" bottom={Math.max(insets.bottom, 34)} />
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
  const mine = m.from === 'me';
  const body =
    m.kind === 'text' ? (
      <Text style={{ fontSize: 15, lineHeight: 20 }}>{m.text}</Text>
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
    <View style={{ flexDirection: 'row', gap: 8, alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
      {!mine ? <Avatar source={photos.leo} size={32} state="hunter" /> : null}
      <Pressable
        accessibilityRole="text"
        delayLongPress={400}
        onLongPress={() => !mine && router.push({ pathname: '/denunciar', params: { id: 'leo' } })}
        style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        {!mine ? <Text style={{ fontSize: 12, color: colors.paperMuted, marginBottom: 2 }}>Leo</Text> : null}
        {body}
      </Pressable>
    </View>
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
