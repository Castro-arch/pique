import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ArcHud, type ArcStatus } from '@/components/ArcHud';
import { BENTO, Sticker, type StickerKind } from '@/components/Bento';
import { BOOSTS, BoostSticker, type BoostKind } from '@/components/Boosts';
import { Button } from '@/components/Button';
import { ChevronLeft, ChevronRight } from '@/components/icons';
import { Appear, Pressy } from '@/components/Motion';
import { Text } from '@/components/Text';
import { routeMs, TutorialMap } from '@/components/TutorialMap';
import type { TutorialMark, TutorialMover } from '@/components/tutorialMapTypes';
import { useCreateGame } from '@/lib/game';
import { useScreenInsets } from '@/lib/screenInsets';
import { TUTORIAL_CENTER, TUTORIAL_ROUTES, TUTORIAL_SPOTS, type LngLat, type Who } from '@/lib/tutorialRoutes';
import { colors, fonts } from '@/theme/tokens';

// 24 Como jogar (antes da partida), versão 3: uma partida contada no mapa de
// ruas de verdade. A câmera voa e dá zoom a cada passo, as pessoas correm pelas
// ruas, a zona cresce e encolhe, e cada boost é pego e mostrado funcionando.
// Em cima, o placar real do jogo. Passa sozinho; segurar pausa; setas dos lados.

const PAPER = colors.paper;
const LIME = colors.lime;
const PINK = colors.pink;
const INK = BENTO.ink;
const STEP_MS = 8500;
const WHO: Who[] = ['C', 'L', 'P', 'T', 'S'];
const CENTER: LngLat = [TUTORIAL_CENTER.lng, TUTORIAL_CENTER.lat];
type Spot = keyof typeof TUTORIAL_SPOTS;
const spot = (k: Spot): LngLat => [TUTORIAL_SPOTS[k][0], TUTORIAL_SPOTS[k][1]];
const mid = (a: LngLat, b: LngLat): LngLat => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

type Hud = { timeLabel: string; time: number; pingLabel: string; ping: number; progress: number; free: number; zone: number; zoneNote: string; status: ArcStatus; statusLabel: string };
type Extra = 'lock' | 'ghost' | 'fake' | 'shield' | 'heart' | 'mega' | 'hand' | 'rescue';
type Step = {
  kicker: string;
  tone: string;
  title: string;
  body: string;
  sticker: [StickerKind, string];
  view?: 'você' | 'caçador';
  hud?: Hud;
  camera: { center: LngLat; zoom: number };
  zone: number; // metros
  hidden?: Who[]; // quem não aparece neste passo
  labels?: Partial<Record<Who, string>>;
  jailed?: Who[];
  pulse?: Who[];
  boostsOnMap?: { kind: BoostKind; at: Spot; picked?: boolean }[];
  held?: BoostKind[]; // boosts guardados (no placar)
  extras?: { kind: Extra; at: LngLat; on?: Who }[];
  roda?: boolean;
  dim?: number;
};

const H = (o: Partial<Hud>): Hud => ({ timeLabel: 'Tempo restante', time: 28 * 60, pingLabel: 'ping em', ping: 60, progress: 0.5, free: 4, zone: 300, zoneNote: 'diâmetro', status: 'hidden', statusLabel: 'Ninguém te vê agora', ...o });

const steps: Step[] = [
  {
    roda: true,
    dim: 0.55,
    kicker: 'A RODA',
    tone: PINK,
    title: 'Juntem os celulares.',
    body: 'Uma luz passa de celular em celular e para em quem vai caçar. Ninguém escolhe, é sorte.',
    sticker: ['crew', LIME],
    camera: { center: CENTER, zoom: 13.6 },
    zone: 0,
    hidden: WHO,
  },
  {
    kicker: 'A ZONA',
    tone: '#5E8C00',
    title: 'O jogo acontece aqui.',
    body: 'Quem cria a partida marca um círculo no mapa, nas ruas de verdade. Ninguém pode sair dele.',
    sticker: ['pin', '#FFC23D'],
    camera: { center: CENTER, zoom: 15.7 },
    zone: 150,
    labels: { C: 'você', L: 'caçador' },
  },
  {
    view: 'você',
    kicker: 'VANTAGEM',
    tone: '#5E8C00',
    title: 'Corra e se esconda.',
    body: 'Os corredores saem na frente pelas ruas. Por 1 minuto o caçador fica travado no meio, sem ver ninguém.',
    sticker: ['run', LIME],
    hud: H({ timeLabel: 'Vantagem', time: 42, pingLabel: '1º ping em', ping: 102, progress: 0, statusLabel: 'Ninguém te vê agora' }),
    camera: { center: CENTER, zoom: 15.7 },
    zone: 150,
    labels: { C: 'você', L: 'travado' },
    extras: [{ kind: 'lock', at: CENTER }],
  },
  {
    view: 'caçador',
    kicker: 'ESCONDIDOS',
    tone: '#1E8FD0',
    title: 'O caçador não vê ninguém…',
    body: 'Acabou a vantagem: ele sai procurando, mas o mapa dele fica vazio. Os corredores não aparecem.',
    sticker: ['ghost', '#B57CFF'],
    hud: H({ time: 28 * 60 + 40, ping: 20, progress: 0.84, status: 'team', statusLabel: 'Só sua equipe te vê' }),
    camera: { center: CENTER, zoom: 15.7 },
    zone: 150,
    hidden: ['C', 'P', 'T', 'S'],
    labels: { L: 'caçador' },
  },
  {
    view: 'caçador',
    kicker: 'O PING',
    tone: '#1E8FD0',
    title: '…até o ping.',
    body: 'A cada 2 minutos o mapa do caçador mostra onde cada corredor estava naquele segundo.',
    sticker: ['radar', '#5AC8FA'],
    hud: H({ ping: 0, progress: 1, status: 'team', statusLabel: 'Só sua equipe te vê' }),
    camera: { center: CENTER, zoom: 15.5 },
    zone: 150,
    pulse: ['C', 'P', 'T', 'S'],
    labels: { C: 'agora', P: 'agora', T: 'agora', S: 'agora', L: 'caçador' },
  },
  {
    view: 'você',
    kicker: 'RASTRO',
    tone: '#8A4FE0',
    title: 'O ping é só uma foto.',
    body: 'Você continua correndo e o caçador vai até onde você estava. Mexa-se logo depois de cada ping.',
    sticker: ['ghost', '#B57CFF'],
    hud: H({ time: 27 * 60 + 10, ping: 70, progress: 0.42 }),
    camera: { center: mid(spot('se'), spot('leste')), zoom: 16.4 },
    zone: 150,
    hidden: ['P', 'T', 'S'],
    labels: { C: 'você agora', L: 'indo pro ping' },
    extras: [{ kind: 'ghost', at: spot('se') }],
  },
  {
    view: 'você',
    kicker: 'BOOSTS',
    tone: '#1E8FD0',
    title: 'Pegue boosts nas ruas.',
    body: 'A cada 4 min aparecem 3 boosts só no mapa dos corredores. Passe em cima para pegar; dá para guardar 2.',
    sticker: ['shield', '#5AC8FA'],
    hud: H({ time: 24 * 60 + 30, ping: 90, progress: 0.25 }),
    camera: { center: mid(CENTER, spot('despiste')), zoom: 15.7 },
    zone: 150,
    hidden: ['L', 'P', 'T', 'S'],
    labels: { C: 'você' },
    boostsOnMap: [
      { kind: 'despiste', at: 'despiste', picked: true },
      { kind: 'sombra', at: 'sombra' },
      { kind: 'escudo', at: 'escudo' },
    ],
  },
  {
    view: 'caçador',
    kicker: 'DESPISTE · custa 2 s',
    tone: '#5E8C00',
    title: 'O próximo ping te mostra no lugar errado.',
    body: `${BOOSTS.despiste.effect} O caçador corre para o ponto falso. O preço: ele te vê ao vivo por 2 s quando você usa.`,
    sticker: ['shuffle', LIME],
    hud: H({ time: 23 * 60, ping: 0, progress: 1, status: 'team', statusLabel: 'Só sua equipe te vê' }),
    camera: { center: mid(spot('fugaDespiste'), spot('pingFalso')), zoom: 16.2 },
    zone: 150,
    hidden: ['C', 'P', 'T', 'S'],
    labels: { L: 'indo pro ping' },
    extras: [{ kind: 'fake', at: spot('pingFalso') }],
  },
  {
    view: 'caçador',
    kicker: 'SOMBRA · custa 5 s',
    tone: '#8A4FE0',
    title: 'Você some do próximo ping.',
    body: `${BOOSTS.sombra.effect} Os outros aparecem e você não. O preço: o caçador te vê ao vivo por 5 s quando você usa.`,
    sticker: ['ghost', '#B57CFF'],
    hud: H({ time: 21 * 60, ping: 0, progress: 1, status: 'team', statusLabel: 'Só sua equipe te vê' }),
    camera: { center: CENTER, zoom: 15.5 },
    zone: 150,
    hidden: ['C'],
    pulse: ['P', 'T', 'S'],
    labels: { P: 'agora', T: 'agora', S: 'agora', L: 'caçador' },
  },
  {
    view: 'você',
    kicker: 'ESCUDO · custa 8 s',
    tone: '#1E8FD0',
    title: 'Ninguém consegue te marcar.',
    body: `${BOOSTS.escudo.effect} O caçador te alcança, mas não vale. O preço: ele te vê ao vivo por 8 s quando você usa.`,
    sticker: ['shield', '#5AC8FA'],
    hud: H({ time: 19 * 60, ping: 50, progress: 0.58 }),
    held: ['escudo'],
    camera: { center: spot('escudo'), zoom: 16.6 },
    zone: 150,
    hidden: ['P', 'T', 'S'],
    labels: { C: 'você · escudo', L: 'não dá!' },
    boostsOnMap: [{ kind: 'escudo', at: 'escudo', picked: true }],
    extras: [{ kind: 'shield', at: spot('escudo'), on: 'C' }],
  },
  {
    view: 'você',
    kicker: 'PERTO DEMAIS',
    tone: PINK,
    title: 'O coração acelera. E o caçador pode gritar.',
    body: 'Caçador chegando perto, seu celular vibra como coração. E ele pode fazer o seu celular gritar para te achar pelo som.',
    sticker: ['heart', PINK],
    hud: H({ time: 17 * 60, ping: 40, progress: 0.66 }),
    camera: { center: mid(spot('pertoEscudo'), spot('coracao')), zoom: 16.6 },
    zone: 150,
    hidden: ['P', 'T', 'S'],
    labels: { C: 'você', L: '40 m' },
    extras: [
      { kind: 'heart', at: spot('pertoEscudo'), on: 'C' },
      { kind: 'mega', at: spot('coracao'), on: 'L' },
    ],
  },
  {
    view: 'você',
    kicker: 'O CERCO',
    tone: '#8A4FE0',
    title: 'A zona aperta a cada 5 min.',
    body: 'Quem ficar fora por 30 s aparece ao vivo para os caçadores até voltar. Fique de olho no círculo.',
    sticker: ['shrink', '#B57CFF'],
    hud: H({ time: 15 * 60, ping: 60, zone: 210, zoneNote: 'encolheu' }),
    camera: { center: CENTER, zoom: 15.5 },
    zone: 105,
    labels: { C: 'você', P: 'fora · 0:30' },
  },
  {
    view: 'você',
    kicker: 'PEGA-PEGA',
    tone: PINK,
    title: 'Encostou, pegou.',
    body: 'O caçador encosta e a pessoa confirma no app. Presa, ela espera: um amigo chega perto e solta.',
    sticker: ['hand', PINK],
    hud: H({ time: 12 * 60, ping: 90, progress: 0.25, free: 3 }),
    camera: { center: mid(spot('nw'), spot('norte')), zoom: 16.2 },
    zone: 105,
    hidden: ['T', 'S'],
    jailed: ['P'],
    labels: { C: 'você · salvando', P: 'presa' },
    extras: [
      { kind: 'hand', at: spot('nw') },
      { kind: 'rescue', at: spot('nw') },
    ],
  },
  {
    dim: 0.5,
    kicker: 'SUA VEZ',
    tone: '#5E8C00',
    title: 'Bora jogar?',
    body: 'Junte 3 ou mais amigos. Um cria a partida e os outros entram pelo QR.',
    sticker: ['run', LIME],
    camera: { center: CENTER, zoom: 14.4 },
    zone: 150,
    hidden: WHO,
  },
];

export default function ComoJogar() {
  const { passo = '1' } = useLocalSearchParams<{ passo?: string; de?: string }>();
  const insets = useScreenInsets();
  const create = useCreateGame();
  const { width: W, height: Hh } = useWindowDimensions();
  const [i, setI] = useState(() => Math.min(Math.max(Number(passo) - 1 || 0, 0), steps.length - 1));
  const [paused, setPaused] = useState(false);
  const [beat, setBeat] = useState(false);
  const [cardTop, setCardTop] = useState(Hh - 260);
  const s = steps[i];
  const last = i === steps.length - 1;

  // Relógio: o tempo do placar desce de verdade enquanto o passo está na tela.
  const [secs, setSecs] = useState(0);
  useEffect(() => setSecs(0), [i]);
  useEffect(() => {
    const t = setInterval(() => {
      setBeat((b) => !b);
      if (!paused) setSecs((n) => n + 0.5);
    }, 500);
    return () => clearInterval(t);
  }, [paused]);

  // Barrinha do passo enchendo; cheia, passa sozinho (menos no último).
  const fill = useRef(new Animated.Value(0)).current;
  const fillAt = useRef(0);
  useEffect(() => {
    fill.setValue(0);
    fillAt.current = 0;
  }, [i, fill]);
  useEffect(() => {
    if (last || paused) {
      fill.stopAnimation((v) => (fillAt.current = v));
      return;
    }
    const anim = Animated.timing(fill, { toValue: 1, duration: STEP_MS * (1 - fillAt.current), easing: Easing.linear, useNativeDriver: false });
    anim.start(({ finished }) => finished && go(i + 1));
    return () => anim.stop();
  }, [i, paused, last]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (n: number) => setI(Math.min(Math.max(n, 0), steps.length - 1));
  const leave = () => router.replace('/');

  // Espaço livre para o mapa mostrar a ação: entre o placar e o cartão.
  const hudScale = 0.74;
  const top = Math.max(insets.top, 20) + 30 + (s.hud ? 205 * hudScale : 0) + (s.view ? 34 : 0);
  const padding = useMemo(() => ({ top, bottom: Math.max(0, Hh - cardTop + 24), left: 30, right: 30 }), [top, Hh, cardTop]);
  const freeMid = top + Math.max(120, cardTop - 24 - top) / 2;

  // Quem anda por onde neste passo.
  const routes = TUTORIAL_ROUTES[i];
  const movers: TutorialMover[] = WHO.map((w) => ({
    id: w,
    route: routes[w],
    runKey: `${i}-${w}`,
    zIndex: w === 'C' ? 10 : w === 'L' ? 8 : 5,
    node: (
      <Person
        who={w}
        hidden={s.hidden?.includes(w)}
        label={s.labels?.[w]}
        jailed={s.jailed?.includes(w)}
        pulse={s.pulse?.includes(w)}
        shield={s.extras?.some((e) => e.kind === 'shield' && e.on === w)}
        heart={s.extras?.some((e) => e.kind === 'heart' && e.on === w) ? beat : undefined}
        mega={s.extras?.some((e) => e.kind === 'mega' && e.on === w) ? beat : undefined}
      />
    ),
  }));
  const cArrives = routeMs(routes.C);
  const marks: TutorialMark[] = [
    ...(s.boostsOnMap ?? []).map((b) => ({
      id: `b-${i}-${b.kind}`,
      at: spot(b.at),
      zIndex: 3,
      node: <MapBoost kind={b.kind} pickAt={b.picked ? cArrives : undefined} />,
    })),
    ...(s.extras ?? [])
      .filter((e) => !e.on)
      .map((e, n) => ({ id: `e-${i}-${n}`, at: e.at, zIndex: e.kind === 'rescue' ? 1 : e.kind === 'fake' ? 9 : 2, node: <ExtraMark kind={e.kind} /> })),
  ];

  const time = s.hud ? Math.max(0, s.hud.time - Math.floor(secs)) : 0;
  const ping = s.hud ? Math.max(0, s.hud.ping - Math.floor(secs)) : 0;
  const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  // O boost pego vai para o placar depois que a pessoa chega nele.
  const pickedNow = (s.boostsOnMap ?? []).filter((b) => b.picked && secs * 1000 > cArrives + 300).map((b) => b.kind);
  const held = [...new Set([...(s.held ?? []), ...pickedNow])].map((kind) => ({ id: `h-${kind}`, kind }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.inkSunken }}>
      <TutorialMap camera={s.camera} padding={padding} zoneRadius={s.zone} movers={movers} marks={marks} />
      {s.dim ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(11,14,17,${s.dim})` }]} /> : null}
      {s.roda ? <Roda cx={W / 2} cy={freeMid} lit={Math.floor(secs * 2) % 6} /> : null}
      {last ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: freeMid - 50, alignItems: 'center' }}>
          <Sticker kind="hand" color={PINK} size={96} tilt={-12} />
        </View>
      ) : null}

      {/* toque: terço esquerdo volta, o resto avança; segurar pausa */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={last ? 'Último passo' : 'Próximo passo'}
        onPressIn={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        onPress={(e) => (e.nativeEvent.pageX < W / 3 ? go(i - 1) : last ? null : go(i + 1))}
        style={StyleSheet.absoluteFill}
      />

      {s.hud ? (
        <View pointerEvents="none" style={[styles.hudBox, { top: Math.max(insets.top, 20) + 22, transform: [{ scale: hudScale }] }]}>
          <ArcHud
            timeLabel={s.hud.timeLabel}
            time={mmss(time)}
            pingLabel={s.hud.ping === 0 ? 'ping agora' : `${s.hud.pingLabel} ${mmss(ping)}`}
            progress={s.hud.progress}
            free={s.hud.free}
            total={4}
            zone={`${s.hud.zone} m`}
            zoneNote={s.hud.zoneNote}
            status={s.hud.status}
            statusLabel={s.hud.statusLabel}
            boosts={s.view === 'você' && (s.boostsOnMap || s.held) ? held : null}
          />
        </View>
      ) : null}

      <View style={[styles.top, { paddingTop: Math.max(insets.top, 20) + 8 }]} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} pointerEvents="box-none">
          <View accessibilityRole="progressbar" accessibilityLabel={`Passo ${i + 1} de ${steps.length}`} style={{ flex: 1, flexDirection: 'row', gap: 3 }} pointerEvents="none">
            {steps.map((_, n) => (
              <View key={n} style={styles.seg}>
                <Animated.View style={[styles.segFill, { width: n < i ? '100%' : n > i ? '0%' : last ? '100%' : fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={leave} hitSlop={12}>
            <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong }}>{last ? 'OK' : 'Pular'}</Text>
          </Pressable>
        </View>
      </View>

      {s.view ? (
        <View pointerEvents="none" style={[styles.viewTag, { top: top - 30 }]}>
          <View style={[styles.viewPill, { backgroundColor: s.view === 'caçador' ? PINK : LIME }]}>
            <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, letterSpacing: 0.6, color: s.view === 'caçador' ? PAPER : INK }}>
              {s.view === 'caçador' ? 'MAPA DO CAÇADOR' : 'O SEU MAPA'}
            </Text>
          </View>
        </View>
      ) : null}

      {i > 0 ? <Arrow side="left" top={freeMid - 18} onPress={() => go(i - 1)} /> : null}
      {!last ? <Arrow side="right" top={freeMid - 18} onPress={() => go(i + 1)} pulse={i === 0} /> : null}

      <View style={[styles.cardBox, { bottom: Math.max(insets.bottom, 16) + 12 }]} pointerEvents={last ? 'box-none' : 'none'} onLayout={(e) => setCardTop(e.nativeEvent.layout.y)}>
        <Appear key={i} style={styles.card}>
          <View style={styles.cardSticker} pointerEvents="none">
            <Sticker kind={s.sticker[0]} color={s.sticker[1]} size={56} tilt={-8} />
          </View>
          <Text style={[styles.kicker, { color: s.tone }]}>{s.kicker}</Text>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.body}>{s.body}</Text>
          {last ? (
            <View style={{ gap: 8, marginTop: 14 }}>
              <Button label="Criar partida" variant="dark" loading={create.busy} onPress={create.run} style={{ minHeight: 56, borderRadius: 22, backgroundColor: INK }} />
              {create.error ? <Text variant="error">{create.error}</Text> : null}
              <Pressy accessibilityRole="button" onPress={() => router.replace('/entrar/qr')} style={styles.qr}>
                <Sticker kind="qr" color={LIME} size={28} tilt={-8} />
                <Text style={{ fontSize: 16, fontFamily: fonts.bodyStrong, color: INK }}>Entrar com QR Code</Text>
              </Pressy>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text onPress={() => router.replace('/treino')} style={styles.link}>
                  Rodada de treino
                </Text>
                <Text onPress={() => go(0)} style={styles.link}>
                  Ver de novo
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.more}>{paused ? 'pausado' : 'passa sozinho · segure para pausar'}</Text>
          )}
        </Appear>
      </View>
    </View>
  );
}

// Uma pessoa no mapa: corredor verde, caçador com anel rosa, você com anel branco.
function Person({ who, hidden, label, jailed, pulse, shield, heart, mega }: { who: Who; hidden?: boolean; label?: string; jailed?: boolean; pulse?: boolean; shield?: boolean; heart?: boolean; mega?: boolean }) {
  const show = useRef(new Animated.Value(hidden ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(show, { toValue: hidden ? 0 : 1, duration: 350, useNativeDriver: true }).start();
  }, [hidden, show]);
  const hunter = who === 'L';
  const me = who === 'C';
  const size = me ? 26 : 22;
  const look = jailed
    ? { backgroundColor: 'rgba(200,242,60,0.18)', borderColor: LIME, borderStyle: 'dashed' as const }
    : hunter
      ? { backgroundColor: INK, borderColor: PINK }
      : me
        ? { backgroundColor: LIME, borderColor: PAPER, boxShadow: '0 0 0 5px rgba(200,242,60,0.28)' }
        : { backgroundColor: LIME, borderColor: INK };
  return (
    <Animated.View style={{ width: 0, height: 0, opacity: show, transform: [{ scale: show.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}>
      {pulse ? <Pulse /> : null}
      {shield ? <View style={styles.shield} /> : null}
      <View style={{ position: 'absolute', left: -70, top: -size / 2, width: 140, alignItems: 'center' }}>
        <View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center' }, look]}>
          <Text style={{ fontFamily: fonts.display, fontSize: 11, color: hunter && !jailed ? PAPER : jailed ? LIME : INK }}>{who}</Text>
        </View>
        {label ? (
          <View style={styles.tag}>
            <Text style={{ fontSize: 10, fontFamily: fonts.bodyStrong }} numberOfLines={1}>
              {label}
            </Text>
          </View>
        ) : null}
      </View>
      {heart !== undefined ? (
        <View style={{ position: 'absolute', left: -46, top: -54 }}>
          <Sticker kind="heart" color={PINK} size={heart ? 40 : 34} tilt={-10} />
        </View>
      ) : null}
      {mega !== undefined ? (
        <View style={{ position: 'absolute', left: 8, top: -52 }}>
          <Sticker kind="mega" color="#FFC23D" size={mega ? 38 : 32} tilt={8} />
        </View>
      ) : null}
    </Animated.View>
  );
}

// Boost no mapa; quando a pessoa chega nele, estoura e some.
function MapBoost({ kind, pickAt }: { kind: BoostKind; pickAt?: number }) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (pickAt === undefined) return;
    const t = setTimeout(() => Animated.timing(pop, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start(), pickAt);
    return () => clearTimeout(t);
  }, [pickAt, pop]);
  return (
    <Animated.View
      style={{
        width: 0,
        height: 0,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }),
        transform: [{ scale: pop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.7, 2.2] }) }],
      }}>
      <View style={{ position: 'absolute' }}>
        <BoostSticker kind={kind} size={38} edge />
      </View>
    </Animated.View>
  );
}

// Peças paradas no mapa: cadeado, fantasma do ping antigo, ping falso, mão do pega, anel de resgate.
function ExtraMark({ kind }: { kind: Extra }) {
  if (kind === 'rescue') return <View style={[styles.rescue, { left: -38, top: -38 }]} />;
  if (kind === 'fake')
    return (
      <View style={{ width: 0, height: 0 }}>
        <Pulse />
        <View style={{ position: 'absolute', left: -70, top: -11, width: 140, alignItems: 'center' }}>
          <View style={[styles.fakeDot]}>
            <Text style={{ fontFamily: fonts.display, fontSize: 11, color: INK }}>C</Text>
          </View>
          <View style={styles.tag}>
            <Text style={{ fontSize: 10, fontFamily: fonts.bodyStrong }}>ping falso</Text>
          </View>
        </View>
      </View>
    );
  if (kind === 'ghost')
    return (
      <View style={{ width: 0, height: 0 }}>
        <View style={{ position: 'absolute', left: -70, top: -11, width: 140, alignItems: 'center' }}>
          <View style={styles.ghostDot} />
          <View style={styles.tag}>
            <Text style={{ fontSize: 10, fontFamily: fonts.bodyStrong }}>visto aqui no ping</Text>
          </View>
        </View>
        <View style={{ position: 'absolute', left: -46, top: -44 }}>
          <Sticker kind="ghost" color="#B57CFF" size={30} tilt={-8} />
        </View>
      </View>
    );
  const map: Record<string, [StickerKind, string, number]> = { lock: ['lock', '#FFC23D', 34], hand: ['hand', PINK, 44] };
  const [k, c, size] = map[kind] ?? ['lock', '#FFC23D', 34];
  return (
    <View style={{ width: 0, height: 0 }}>
      <View style={{ position: 'absolute', left: -size / 2, top: -size - 14 }}>
        <Sticker kind={k} color={c} size={size} tilt={kind === 'hand' ? 18 : -6} />
      </View>
    </View>
  );
}

// Seta redonda num dos lados; no primeiro passo ela "chama" o dedo.
function Arrow({ side, top, onPress, pulse }: { side: 'left' | 'right'; top: number; onPress: () => void; pulse?: boolean }) {
  const nudge = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, { toValue: 6, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(nudge, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, nudge]);
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <Animated.View style={[styles.arrowBox, side === 'left' ? { left: 4 } : { right: 4 }, { top, transform: [{ translateX: nudge }] }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={side === 'left' ? 'Passo anterior' : 'Próximo passo'} onPress={onPress} hitSlop={10} style={styles.arrow}>
        <Icon size={18} color={PAPER} strokeWidth={2.8} />
      </Pressable>
    </Animated.View>
  );
}

// Anel rosa que cresce e some: "apareceu no ping".
function Pulse() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <Animated.View
      style={[styles.pulse, { opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.6] }) }] }]}
    />
  );
}

// A roda: seis celulares em volta e a luz passando por eles.
function Roda({ cx, cy, lit }: { cx: number; cy: number; lit: number }): ReactNode {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 6 }, (_, n) => {
        const a = (n / 6) * Math.PI * 2 - Math.PI / 2;
        const on = n === lit;
        return (
          <View
            key={n}
            style={[
              styles.phone,
              { left: cx + Math.cos(a) * 108 - 22, top: cy + Math.sin(a) * 108 - 36, transform: [{ rotate: `${(a * 180) / Math.PI + 90}deg` }] },
              on ? { backgroundColor: PINK, borderColor: PAPER, boxShadow: '0 0 30px 10px rgba(255,42,85,0.55)' } : null,
            ]}>
            <Text style={{ fontFamily: fonts.display, fontSize: 15, color: on ? PAPER : '#55606B' }}>{'CLJPTS'[n]}</Text>
          </View>
        );
      })}
      <View style={{ position: 'absolute', left: cx - 40, top: cy - 40 }}>
        <Sticker kind="hand" color={PINK} size={80} tilt={-10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 16, right: 16, top: 0 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(243,240,232,0.25)', overflow: 'hidden' },
  segFill: { height: 4, borderRadius: 2, backgroundColor: PAPER },
  hudBox: { position: 'absolute', left: 0, right: 0, height: 250, transformOrigin: 'top center' },
  viewTag: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  viewPill: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 2, borderColor: INK },
  arrowBox: { position: 'absolute' },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(11,15,19,0.78)', borderWidth: 2, borderColor: 'rgba(243,240,232,0.35)', alignItems: 'center', justifyContent: 'center' },
  cardBox: { position: 'absolute', left: 16, right: 16 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: INK, borderRadius: 26, boxShadow: '4px 5px 0 #0B0F13', paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16 },
  cardSticker: { position: 'absolute', right: 16, top: -30 },
  kicker: { fontSize: 11, fontFamily: fonts.bodyStrong, letterSpacing: 0.9 },
  title: { fontFamily: fonts.display, fontSize: 25, lineHeight: 27, letterSpacing: -0.5, color: INK, marginTop: 4, paddingRight: 44 },
  body: { fontSize: 14, lineHeight: 20, color: INK, opacity: 0.75, marginTop: 8 },
  more: { fontSize: 12, fontFamily: fonts.bodyStrong, color: INK, opacity: 0.45, marginTop: 12 },
  link: { fontSize: 13, fontFamily: fonts.bodyStrong, color: INK, opacity: 0.6, paddingVertical: 4 },
  qr: { height: 56, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: INK, boxShadow: '3px 4px 0 #0B0F13', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  tag: { marginTop: 3, backgroundColor: INK, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 },
  pulse: { position: 'absolute', left: -13, top: -13, width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: PINK },
  shield: { position: 'absolute', left: -30, top: -30, width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: '#5AC8FA', backgroundColor: 'rgba(90,200,250,0.18)' },
  rescue: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderStyle: 'dashed', borderColor: LIME, backgroundColor: 'rgba(200,242,60,0.12)' },
  fakeDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: INK, backgroundColor: LIME, alignItems: 'center', justifyContent: 'center', opacity: 0.85 },
  ghostDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderStyle: 'dashed', borderColor: LIME, backgroundColor: 'rgba(200,242,60,0.18)' },
  phone: { position: 'absolute', width: 44, height: 72, borderRadius: 12, backgroundColor: '#1A2027', borderWidth: 3, borderColor: '#2A333D', alignItems: 'center', justifyContent: 'center' },
});
