import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, ChevronLeft, Lock } from '@/components/icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { StepBars } from '@/components/Controls';
import { MapBackdrop, MapPin } from '@/components/MapBackdrop';
import { CloseButton } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

type Step = { kicker: string; title: string; body: string; art: () => ReactNode; extra?: () => ReactNode };

// Linha 16 do design: primeiro o que o jogo É, depois uma regra por tela.
const steps: Step[] = [
  {
    kicker: 'O que é o Pique',
    title: 'Pique-esconde de verdade, na rua.',
    body: 'Você e seus amigos saem pelo bairro: uns se escondem, outros procuram. O celular é só o juiz: mostra o mapa, conta o tempo e avisa quem foi pego.',
    art: () => (
      <ArtBox>
        <MapBackdrop fades={false} />
        <Svg width="100%" height="100%" viewBox="0 0 350 330" style={StyleSheet.absoluteFill}>
          <Path d="M96 205 C140 170 185 135 222 100" stroke={colors.pink} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 8" fill="none" />
        </Svg>
        <Chip label="3 a 20 pessoas · ao ar livre" tone="dark" style={{ position: 'absolute', left: 14, top: 14 }} />
        <Who x={70} y={470} name="Leo" role="hunter" note="procurando…" />
        <Who x={240} y={170} name="Priya" role="runner" note="escondida" />
        <Who x={300} y={600} name="Teo" role="runner" />
      </ArtBox>
    ),
  },
  {
    kicker: 'Dois times',
    title: 'Uns fogem, outros caçam.',
    body: 'No começo da partida, um sorteio decide quem é caçador. Todo o resto é corredor.',
    art: () => (
      <ArtBox>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Team hunter title="Caçadores" body="Procuram e pegam os corredores." names={['Leo', 'Teo']} />
          <Team title="Corredores" body="Se escondem e tentam não ser pegos." names={['Priya', 'Sasha', 'Jonah', 'Vic']} />
        </View>
      </ArtBox>
    ),
  },
  {
    kicker: 'A área do jogo',
    title: 'Todo mundo fica dentro do círculo.',
    body: 'Quem cria a partida desenha um círculo no mapa: um quarteirão, uma praça, um parque. Sair dele não vale.',
    art: () => (
      <ArtBox>
        <MapBackdrop zone={{ cx: 195, cy: 380, r: 150 }} fades={false} />
        <Who x={130} y={280} name="Priya" role="runner" />
        <Who x={225} y={440} name="Leo" role="hunter" />
        <Chip label="dentro vale · fora não vale" tone="dark" dot={colors.lime} style={{ position: 'absolute', left: 14, bottom: 14 }} />
      </ArtBox>
    ),
  },
  {
    kicker: 'Os primeiros minutos',
    title: 'Primeiro, os corredores somem.',
    body: 'Assim que começa, os corredores têm uns minutos para se esconder. A tela dos caçadores fica travada até o tempo acabar.',
    art: () => (
      <ArtBox>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <View style={[styles.mini, { backgroundColor: colors.lime }]}>
            <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.limeInk }}>Corra!</Text>
            <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, color: colors.limeInk }}>corredor</Text>
          </View>
          <View style={[styles.mini, { backgroundColor: colors.inkRaised, borderWidth: 2, borderColor: colors.pink }]}>
            <Lock size={28} color={colors.pink} strokeWidth={2.4} />
            <Text style={{ fontFamily: fonts.display, fontSize: 28 }}>2:03</Text>
            <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, color: colors.pink }}>caçador travado</Text>
          </View>
        </View>
      </ArtBox>
    ),
  },
  {
    kicker: 'O segredo',
    title: 'O mapa só mostra de vez em quando.',
    body: 'Os caçadores não veem ninguém ao vivo. A cada 2 minutos o mapa mostra onde cada corredor estava naquela hora. Aí é correr atrás.',
    art: () => (
      <ArtBox>
        <MapBackdrop fades={false} />
        <Who x={240} y={170} name="Priya" role="runner" tag="estava aqui" />
        <Who x={80} y={460} name="Leo" role="hunter" />
        <View style={styles.pingBar}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong }}>próximo ping</Text>
            <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, color: colors.lime }}>0:42</Text>
          </View>
          <View style={{ marginTop: 8, height: 6, borderRadius: 3, backgroundColor: colors.inkBorder }}>
            <View style={{ width: '65%', height: 6, borderRadius: 3, backgroundColor: colors.lime }} />
          </View>
        </View>
      </ArtBox>
    ),
  },
  {
    kicker: 'Pegou!',
    title: 'Encostou, pegou. Quem ganha?',
    body: 'O caçador encosta no corredor de verdade e o corredor confirma no celular.',
    art: () => (
      <ArtBox height={290}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar name="Leo" size={56} state="hunter" />
            <ArrowRight size={34} color={colors.paper} strokeWidth={2.6} />
            <Avatar name="Priya" size={56} state="runner" />
          </View>
          <View style={styles.ask}>
            <Text variant="small">No celular da Priya</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, marginTop: 2 }}>O Leo te pegou?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={[styles.askBtn, { backgroundColor: colors.pink }]}>
                <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.pinkInk }}>Fui pega</Text>
              </View>
              <View style={[styles.askBtn, { borderWidth: 1, borderColor: colors.inkBorder }]}>
                <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong }}>Não</Text>
              </View>
            </View>
          </View>
        </View>
      </ArtBox>
    ),
    extra: () => (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <View style={[styles.win, { backgroundColor: colors.limeTint, borderColor: colors.lime }]}>
          <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: colors.lime }}>CORREDORES VENCEM</Text>
          <Text style={{ fontSize: 13, marginTop: 3 }}>se alguém estiver livre quando o tempo acabar</Text>
        </View>
        <View style={[styles.win, { backgroundColor: colors.pinkTint, borderColor: colors.pink }]}>
          <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: colors.pink }}>CAÇADORES VENCEM</Text>
          <Text style={{ fontSize: 13, marginTop: 3 }}>se pegarem todo mundo antes</Text>
        </View>
      </View>
    ),
  },
];

// 16.1 a 16.6 Como jogar
export default function ComoJogar() {
  // de=inicio: veio do cadastro (depois das permissões) e termina na home.
  const { passo = '1', de } = useLocalSearchParams<{ passo?: string; de?: string }>();
  const onboarding = de === 'inicio';
  const i = Math.min(Math.max(Number(passo) - 1 || 0, 0), steps.length - 1);
  const s = steps[i];
  const last = i === steps.length - 1;
  const go = (n: number) => router.replace({ pathname: '/como-jogar/[passo]', params: { passo: String(n), ...(onboarding ? { de } : {}) } });

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
      <Headline mark={s.title.endsWith("?") ? "?" : "."} style={{ marginTop: 6 }}>
        {s.title.replace(/[.?]$/, "")}
      </Headline>
      <Text variant="muted" style={{ marginTop: 10, fontSize: last ? 15 : 16 }}>{s.body}</Text>
      {s.extra?.()}
      <Spacer />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {i === 0 ? null : (
          <Pressable accessibilityRole="button" accessibilityLabel="Passo anterior" onPress={() => go(i)} style={styles.backBtn}>
            <ChevronLeft size={20} color={colors.paper} strokeWidth={2.4} />
          </Pressable>
        )}
        <Button
          label={last ? 'Entendi, bora jogar' : i === 0 ? 'Como funciona?' : 'Próximo'}
          style={{ flex: 1 }}
          onPress={() => (last ? router.replace('/') : go(i + 2))}
        />
      </View>
      {i === 0 ? (
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={{ alignSelf: 'center', marginTop: 10, padding: 4 }}>
          <Text variant="small">
            Já jogou antes? <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, textDecorationLine: 'underline' }}>Pular explicação</Text>
          </Text>
        </Pressable>
      ) : null}
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

// Uma pessoa no mapinha das artes, com a etiqueta embaixo.
function Who({ x, y, name, role, note, tag }: { x: number; y: number; name: string; role: 'runner' | 'hunter'; note?: string; tag?: string }) {
  const color = role === 'runner' ? colors.lime : colors.pink;
  return (
    <MapPin x={x} y={y}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Avatar name={name} size={42} state={role} />
        {note ? <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, color }}>{note}</Text> : null}
        {tag ? (
          <View style={{ backgroundColor: colors.lime, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 }}>
            <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: colors.limeInk }}>{tag}</Text>
          </View>
        ) : null}
      </View>
    </MapPin>
  );
}

// Metade da arte dos dois times.
function Team({ hunter, title, body, names }: { hunter?: boolean; title: string; body: string; names: string[] }) {
  const color = hunter ? colors.pink : colors.lime;
  return (
    <View style={{ flex: 1, backgroundColor: hunter ? colors.pinkTint : colors.limeTint, padding: 16 }}>
      <View style={{ flexDirection: 'row' }}>
        {names.map((n, k) => (
          <Avatar key={n} name={n} size={32} state={hunter ? 'hunter' : 'runner'} style={{ marginLeft: k ? -8 : 0 }} />
        ))}
      </View>
      <Spacer />
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.display, fontSize: 24, color }}>
        {title}
      </Text>
      <Text style={{ fontSize: 14, lineHeight: 19, marginTop: 6 }}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44, marginTop: 8 },
  art: { marginTop: 8, borderRadius: radius.xxl, overflow: 'hidden', backgroundColor: colors.inkSunken },
  mini: { width: 120, height: 210, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 6 },
  pingBar: { position: 'absolute', left: 14, right: 14, bottom: 14, backgroundColor: colors.inkRaised, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12 },
  ask: { backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, width: 250 },
  askBtn: { flex: 1, alignItems: 'center', borderRadius: 12, paddingVertical: 8 },
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
