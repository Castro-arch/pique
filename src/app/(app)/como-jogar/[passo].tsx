import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Eye, Lock } from '@/components/icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { CodeInput } from '@/components/CodeInput';
import { StepBars } from '@/components/Controls';
import { MapBackdrop, MapPin } from '@/components/MapBackdrop';
import { CloseButton } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { photos } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

type Step = { kicker: string; title: string; body: string; art: () => ReactNode; extra?: () => ReactNode };

const steps: Step[] = [
  {
    kicker: '01 · Anfitrião',
    title: 'Monte a arena',
    body: 'Quem cria a partida marca a zona no mapa, escolhe o tempo da rodada e de quanto em quanto sai o ping. Depois manda o código para a crew.',
    art: () => (
      <ArtBox>
        <MapBackdrop zone={{ cx: 195, cy: 380, r: 260 }} fades={false} />
        <Chip label="Você é o anfitrião" tone="dark" style={{ position: 'absolute', left: 14, top: 14 }} />
        <View style={styles.codeCard}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: colors.limeInk }}>CÓDIGO DA PARTIDA</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.limeInk, letterSpacing: -0.5 }}>TACO42</Text>
          </View>
          <View style={styles.share}><Text style={{ color: colors.paper, fontFamily: fonts.bodyStrong, fontSize: 13 }}>Compartilhar</Text></View>
        </View>
      </ArtBox>
    ),
  },
  {
    kicker: '02 · Todo mundo',
    title: 'Escolha um lado',
    body: 'A crew entra com o código de 6 letras e escolhe ser caçador ou corredor. Em dúvida? O sorteio completa o time que estiver menor.',
    art: () => (
      <ArtBox plain>
        <Text variant="label">Entrar com código</Text>
        <View style={{ marginTop: 8 }} pointerEvents="none">
          <CodeInput label="Código de exemplo" value="TACO42" onChange={() => {}} kind="alphanumeric" />
        </View>
        <View style={{ gap: 8, marginTop: 16 }}>
          <RolePick photo={photos.leo} name="Leo" role="hunter" />
          <RolePick photo={photos.priya} name="Priya" role="runner" />
          <RolePick photo={photos.jonah} name="Jonah" role="draw" />
        </View>
      </ArtBox>
    ),
  },
  {
    kicker: '03 · Vantagem',
    title: 'Espalhe e se esconda',
    body: 'Os corredores têm alguns minutos de vantagem para sumir dentro da zona. Os caçadores esperam parados, sem espiar.',
    art: () => (
      <ArtBox>
        <MapBackdrop zone={{ cx: 195, cy: 422, r: 300 }} fades={false} />
        <Chip label="Ninguém vê os corredores agora" tone="dark" dot={colors.lime} style={{ position: 'absolute', left: 14, top: 14 }} />
        <MapPin x={70} y={170}><Avatar source={photos.priya} size={36} state="runner" /></MapPin>
        <MapPin x={290} y={220}><Avatar source={photos.sasha} size={36} state="runner" /></MapPin>
        <MapPin x={90} y={600}><Avatar source={photos.teo} size={36} state="runner" /></MapPin>
        <MapPin x={270} y={600}><Avatar source={photos.jonah} size={36} state="runner" /></MapPin>
        <MapPin x={177} y={390}><Avatar source={photos.leo} size={36} state="hunter" /></MapPin>
        <MapPin x={135} y={480}>
          <Chip label="esperando 3:00" tone="dark" icon={<Lock size={11} color={colors.pink} strokeWidth={2.6} />} />
        </MapPin>
      </ArtBox>
    ),
  },
  {
    kicker: '04 · Caça',
    title: 'Ping. Corre',
    body: 'Não é rastreio ao vivo: a cada ping, os caçadores veem onde os corredores estavam. Pega é na vida real, e o corredor confirma no celular.',
    art: () => (
      <ArtBox height={290}>
        <MapBackdrop zone={{ cx: 260, cy: 280, r: 120 }} fades={false} />
        <Svg width="100%" height="100%" viewBox="0 0 350 290" style={StyleSheet.absoluteFill}>
          <Path d="M98 222 C130 196 170 170 210 128" stroke={colors.pink} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 8" fill="none" />
        </Svg>
        <Chip label="Ping a cada 2 min" tone="hunterSolid" icon={<Eye size={14} color={colors.paper} />} style={{ position: 'absolute', left: 14, top: 14 }} />
        <View style={{ position: 'absolute', left: 216, top: 84 }}><Avatar source={photos.priya} size={40} state="runner" glow /></View>
        <View style={{ position: 'absolute', left: 192, top: 134 }}><Chip label="Priya · 0:28 atrás" tone="runnerSolid" /></View>
        <View style={{ position: 'absolute', left: 78, top: 204 }}><Avatar source={photos.leo} size={40} state="hunter" /></View>
      </ArtBox>
    ),
    extra: () => (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <View style={[styles.win, { backgroundColor: colors.limeTint, borderColor: colors.lime }]}>
          <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: colors.lime }}>CORREDORES VENCEM</Text>
          <Text style={{ fontSize: 13, marginTop: 3 }}>se alguém ainda estiver livre no fim</Text>
        </View>
        <View style={[styles.win, { backgroundColor: '#2A0E16', borderColor: colors.pink }]}>
          <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: colors.pink }}>CAÇADORES VENCEM</Text>
          <Text style={{ fontSize: 13, marginTop: 3 }}>se pegarem todos antes do tempo</Text>
        </View>
      </View>
    ),
  },
];

// 2.1 a 2.4 Como jogar
export default function ComoJogar() {
  const { passo = '1' } = useLocalSearchParams<{ passo?: string }>();
  const i = Math.min(Math.max(Number(passo) - 1 || 0, 0), steps.length - 1);
  const s = steps[i];
  const last = i === steps.length - 1;
  const go = (n: number) => router.replace({ pathname: '/como-jogar/[passo]', params: { passo: String(n) } });

  return (
    <Screen>
      <StepBars total={steps.length} current={i + 1} />
      <View style={styles.head}>
        <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 0.7, color: colors.paperMuted }}>
          COMO JOGAR · {i + 1} DE {steps.length}
        </Text>
        <CloseButton onPress={() => router.replace('/')} />
      </View>
      {s.art()}
      <Text style={{ fontFamily: fonts.display, fontSize: 15, color: colors.lime, marginTop: 22 }}>{s.kicker}</Text>
      <Headline style={{ marginTop: 6 }}>{s.title}</Headline>
      <Text variant="muted" style={{ marginTop: 10, fontSize: last ? 15 : 16 }}>{s.body}</Text>
      {s.extra?.()}
      <Spacer />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {i === 0 ? (
          <Button label="Pular" variant="secondary" style={{ paddingHorizontal: 20 }} onPress={() => router.replace('/')} />
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Passo anterior" onPress={() => go(i)} style={styles.backBtn}>
            <ChevronLeft size={20} color={colors.paper} strokeWidth={2.4} />
          </Pressable>
        )}
        <Button
          label={last ? 'Escolher meu lado' : 'Próximo'}
          style={{ flex: 1 }}
          onPress={() => (last ? router.replace('/lado') : go(i + 2))}
        />
      </View>
    </Screen>
  );
}

function ArtBox({ children, plain, height = 330 }: { children: ReactNode; plain?: boolean; height?: number }) {
  return (
    <View
      style={[
        styles.art,
        { height },
        plain && { backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, padding: 18 },
      ]}>
      {children}
    </View>
  );
}

function RolePick({ photo, name, role }: { photo: number; name: string; role: 'runner' | 'hunter' | 'draw' }) {
  const label = role === 'runner' ? 'Corredor' : role === 'hunter' ? 'Caçador' : 'Sorteio';
  const color = role === 'runner' ? colors.lime : role === 'hunter' ? colors.pink : colors.paperMuted;
  return (
    <View style={styles.pick}>
      <Avatar source={photo} size={36} state={role} />
      <Text style={{ flex: 1, fontSize: 15 }}>{name}</Text>
      <Text style={{ color, fontFamily: fonts.bodyStrong, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44, marginTop: 8 },
  art: { marginTop: 8, borderRadius: radius.xxl, overflow: 'hidden', backgroundColor: colors.inkSunken },
  codeCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: colors.lime,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  share: { backgroundColor: colors.limeInk, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.ink, borderRadius: radius.md, padding: 8, paddingRight: 12 },
  win: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: 10 },
  backBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
