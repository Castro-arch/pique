import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ArcHud, type ArcStatus } from '@/components/ArcHud';
import { BENTO, Sticker, type StickerKind } from '@/components/Bento';
import { BoostSticker } from '@/components/Boosts';
import { Button } from '@/components/Button';
import { ChevronLeft, ChevronRight } from '@/components/icons';
import { MapBackdrop } from '@/components/MapBackdrop';
import { Appear, Pressy } from '@/components/Motion';
import { Text } from '@/components/Text';
import { useCreateGame } from '@/lib/game';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts } from '@/theme/tokens';

// 24 Como jogar (antes da partida), versão 2. Uma partida só, contada passo a
// passo: as mesmas pessoas no mesmo mapa, andando de um passo para o outro, com
// o placar de verdade do jogo (ArcHud) em cima. Passa sozinho a cada ~7 s, com
// setas dos lados; segurar o dedo pausa. Lição do SCRAM: o tutorial é a tela do jogo.

const PAPER = colors.paper;
const LIME = colors.lime;
const PINK = colors.pink;
const INK = BENTO.ink;
const STEP_MS = 7000;

type Who = 'C' | 'L' | 'P' | 'T' | 'S';
type Pos = { x: number; y: number; show?: boolean; label?: string; ghost?: boolean };
type Hud = { timeLabel: string; time: number; pingLabel: string; ping: number; progress: number; free: number; zone: number; zoneNote: string; status: ArcStatus; statusLabel: string };
type Step = {
  kicker: string;
  tone: string;
  title: string;
  body: string;
  sticker: [StickerKind, string];
  view?: 'você' | 'caçador'; // de quem é o mapa mostrado
  hud?: Hud;
  zone?: number; // raio da zona no desenho (0 = sem zona)
  people: Partial<Record<Who, Pos>>;
  ping?: boolean; // pulsos em quem aparece
  extra?: (at: (x: number, y: number) => { left: number; top: number }, beat: boolean) => ReactNode;
  roda?: boolean;
  dim?: number;
};

// Posições no espaço do desenho (390 de largura, zona centrada em 195,430).
const MID = { x: 195, y: 430 };
const steps: Step[] = [
  {
    roda: true,
    dim: 0.55,
    kicker: 'A RODA',
    tone: PINK,
    title: 'Juntem os celulares.',
    body: 'Uma luz passa de celular em celular e para em quem vai caçar. Ninguém escolhe, é sorte.',
    sticker: ['crew', LIME],
    people: {},
  },
  {
    kicker: 'A ZONA',
    tone: '#5E8C00',
    title: 'O jogo acontece aqui.',
    body: 'Quem cria a partida marca um círculo no mapa. Todo mundo joga dentro dele, nas ruas de verdade.',
    sticker: ['pin', '#FFC23D'],
    zone: 150,
    people: { C: { ...MID, x: 180, label: 'você' }, L: { ...MID, x: 210 }, P: { x: 195, y: 410 }, T: { x: 185, y: 452 }, S: { x: 208, y: 448 } },
  },
  {
    view: 'você',
    kicker: 'VANTAGEM',
    tone: '#5E8C00',
    title: 'Corra e se esconda.',
    body: 'Os corredores saem na frente. Por 1 minuto o caçador fica travado no meio, sem ver ninguém.',
    sticker: ['run', LIME],
    hud: { timeLabel: 'Vantagem', time: 42, pingLabel: '1º ping em', ping: 102, progress: 0, free: 4, zone: 600, zoneNote: 'diâmetro', status: 'hidden', statusLabel: 'Ninguém te vê agora' },
    zone: 150,
    people: { C: { x: 262, y: 505, label: 'você' }, L: { ...MID, label: 'travado' }, P: { x: 120, y: 340 }, T: { x: 140, y: 520 }, S: { x: 290, y: 360 } },
    extra: (at) => (
      <Spot at={at(195, 392)}>
        <Sticker kind="lock" color="#FFC23D" size={36} tilt={-6} />
      </Spot>
    ),
  },
  {
    view: 'caçador',
    kicker: 'ESCONDIDOS',
    tone: '#1E8FD0',
    title: 'O caçador não vê ninguém…',
    body: 'Depois da vantagem, o mapa dele fica vazio. Os corredores não aparecem.',
    sticker: ['ghost', '#B57CFF'],
    hud: { timeLabel: 'Tempo restante', time: 28 * 60 + 40, pingLabel: 'ping em', ping: 20, progress: 0.84, free: 4, zone: 600, zoneNote: 'diâmetro', status: 'team', statusLabel: 'Só sua equipe te vê' },
    zone: 150,
    people: { C: { x: 262, y: 505, show: false }, L: { x: 200, y: 400, label: 'caçador' }, P: { x: 120, y: 340, show: false }, T: { x: 140, y: 520, show: false }, S: { x: 290, y: 360, show: false } },
  },
  {
    view: 'caçador',
    kicker: 'O PING',
    tone: '#1E8FD0',
    title: '…até o ping.',
    body: 'A cada 2 minutos o caçador vê onde cada corredor estava naquele segundo.',
    sticker: ['radar', '#5AC8FA'],
    hud: { timeLabel: 'Tempo restante', time: 28 * 60, pingLabel: 'ping', ping: 0, progress: 1, free: 4, zone: 600, zoneNote: 'diâmetro', status: 'team', statusLabel: 'Só sua equipe te vê' },
    zone: 150,
    ping: true,
    people: { C: { x: 262, y: 505, label: 'agora' }, L: { x: 200, y: 400, label: 'caçador' }, P: { x: 120, y: 340, label: 'agora' }, T: { x: 140, y: 520, label: 'agora' }, S: { x: 290, y: 360, label: 'agora' } },
  },
  {
    view: 'você',
    kicker: 'RASTRO',
    tone: '#8A4FE0',
    title: 'O ping é só uma foto.',
    body: 'Se você continuar andando, o caçador vai atrás de onde você estava. Mexa-se depois de cada ping.',
    sticker: ['ghost', '#B57CFF'],
    hud: { timeLabel: 'Tempo restante', time: 27 * 60 + 10, pingLabel: 'ping em', ping: 70, progress: 0.42, free: 4, zone: 600, zoneNote: 'diâmetro', status: 'hidden', statusLabel: 'Ninguém te vê agora' },
    zone: 150,
    people: { C: { x: 300, y: 420, label: 'você agora' }, L: { x: 190, y: 548, label: 'indo pro ping' }, P: { x: 120, y: 340, show: false }, T: { x: 140, y: 520, show: false }, S: { x: 290, y: 360, show: false } },
    extra: (at) => (
      <>
        <Mark at={at(262, 505)} ghost label="você há 1 min" />
        <Spot at={at(238, 470)}>
          <Sticker kind="ghost" color="#B57CFF" size={36} tilt={-8} />
        </Spot>
      </>
    ),
  },
  {
    view: 'você',
    kicker: 'O CERCO',
    tone: '#8A4FE0',
    title: 'A zona aperta a cada 5 min.',
    body: 'Ficou fora por 30 segundos? Os caçadores passam a te ver ao vivo até você voltar.',
    sticker: ['shrink', '#B57CFF'],
    hud: { timeLabel: 'Tempo restante', time: 25 * 60, pingLabel: 'ping em', ping: 60, progress: 0.5, free: 4, zone: 420, zoneNote: 'encolheu', status: 'hidden', statusLabel: 'Ninguém te vê agora' },
    zone: 105,
    people: { C: { x: 228, y: 450, label: 'você' }, L: { x: 170, y: 420 }, P: { x: 320, y: 360, label: 'fora · 0:30' }, T: { x: 160, y: 480, show: false }, S: { x: 240, y: 380, show: false } },
  },
  {
    view: 'você',
    kicker: 'TRUQUES',
    tone: PINK,
    title: 'Boosts e coração acelerado.',
    body: 'Pegue boosts nas ruas para despistar. Se o coração acelerar, tem caçador perto: saia daí.',
    sticker: ['heart', PINK],
    hud: { timeLabel: 'Tempo restante', time: 22 * 60, pingLabel: 'ping em', ping: 40, progress: 0.66, free: 4, zone: 420, zoneNote: 'diâmetro', status: 'hidden', statusLabel: 'Ninguém te vê agora' },
    zone: 105,
    people: { C: { x: 215, y: 470, label: 'você' }, L: { x: 250, y: 410, label: '40 m' }, P: { x: 150, y: 400, show: false }, T: { x: 160, y: 480, show: false }, S: { x: 240, y: 380, show: false } },
    extra: (at, beat) => (
      <>
        <Spot at={at(140, 430)}>
          <BoostSticker kind="despiste" size={40} edge />
        </Spot>
        <Spot at={at(178, 515)}>
          <BoostSticker kind="escudo" size={40} edge />
        </Spot>
        <Spot at={at(170, 400)}>
          <Sticker kind="heart" color={PINK} size={beat ? 54 : 46} tilt={-10} />
        </Spot>
      </>
    ),
  },
  {
    view: 'você',
    kicker: 'PEGA-PEGA',
    tone: PINK,
    title: 'Encostou, pegou.',
    body: 'O caçador encosta e você confirma no app. Preso, você espera: um amigo pode chegar perto e te soltar.',
    sticker: ['hand', PINK],
    hud: { timeLabel: 'Tempo restante', time: 18 * 60 + 40, pingLabel: 'ping em', ping: 90, progress: 0.25, free: 3, zone: 420, zoneNote: 'diâmetro', status: 'hidden', statusLabel: 'Ninguém te vê agora' },
    zone: 105,
    people: { C: { x: 205, y: 505, label: 'você · salvando' }, L: { x: 268, y: 398 }, P: { x: 150, y: 470, label: 'presa', ghost: true }, T: { x: 160, y: 480, show: false }, S: { x: 240, y: 380, show: false } },
    extra: (at, beat) => (
      <>
        <Spot at={at(150, 470)}>
          <View style={[styles.rescue, { borderColor: beat ? PAPER : LIME }]} />
        </Spot>
        <Spot at={at(290, 362)}>
          <Sticker kind="hand" color={PINK} size={44} tilt={18} />
        </Spot>
      </>
    ),
  },
  {
    dim: 0.5,
    kicker: 'SUA VEZ',
    tone: '#5E8C00',
    title: 'Bora jogar?',
    body: 'Junte 3 ou mais amigos. Um cria a partida e os outros entram pelo QR.',
    sticker: ['run', LIME],
    zone: 150,
    people: {},
    extra: (at) => (
      <Spot at={at(195, 430)}>
        <Sticker kind="hand" color={PINK} size={90} tilt={-12} />
      </Spot>
    ),
  },
];

const WHO: Who[] = ['C', 'L', 'P', 'T', 'S'];
const HUNTER: Who = 'L';

export default function ComoJogar() {
  const { passo = '1' } = useLocalSearchParams<{ passo?: string; de?: string }>();
  const insets = useScreenInsets();
  const create = useCreateGame();
  const { width: W, height: H } = useWindowDimensions();
  const [i, setI] = useState(() => Math.min(Math.max(Number(passo) - 1 || 0, 0), steps.length - 1));
  const [paused, setPaused] = useState(false);
  const [beat, setBeat] = useState(false);
  const [cardTop, setCardTop] = useState(H - 250);
  const s = steps[i];
  const last = i === steps.length - 1;

  // Relógio do passo: o tempo do placar desce de verdade enquanto o passo está na tela.
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

  // Espaço livre para o desenho: entre o placar (ou a barrinha) e o cartão.
  const hudScale = 0.74;
  const top = Math.max(insets.top, 20) + 30 + (s.hud ? 205 * hudScale : 0) + (s.view ? 34 : 0);
  const room = Math.max(170, cardTop - 30 - top);
  const k = Math.min(1.1, W / 370, room / 340);
  const ox = W / 2 - 195 * k;
  const oy = top + room / 2 - 430 * k;
  const at = (x: number, y: number) => ({ left: ox + x * k, top: oy + y * k });

  // As pessoas andam de um passo para o outro.
  const pos = useRef(Object.fromEntries(WHO.map((w) => [w, new Animated.ValueXY({ x: 195, y: 430 })])) as Record<Who, Animated.ValueXY>).current;
  const vis = useRef(Object.fromEntries(WHO.map((w) => [w, new Animated.Value(0)])) as Record<Who, Animated.Value>).current;
  const zoneR = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const moves = WHO.flatMap((w) => {
      const p = s.people[w];
      const show = !!p && p.show !== false;
      return [
        ...(p ? [Animated.timing(pos[w], { toValue: { x: p.x, y: p.y }, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: false })] : []),
        Animated.timing(vis[w], { toValue: show ? 1 : 0, duration: 350, useNativeDriver: false }),
      ];
    });
    Animated.parallel([...moves, Animated.timing(zoneR, { toValue: s.zone ?? 0, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: false })]).start();
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const px = (v: Animated.Value, o: number) => v.interpolate({ inputRange: [0, 1000], outputRange: [o, o + 1000 * k] });
  const time = s.hud ? Math.max(0, s.hud.time - Math.floor(secs)) : 0;
  const ping = s.hud ? Math.max(0, s.hud.ping - Math.floor(secs)) : 0;
  const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.inkSunken }}>
      <MapBackdrop fades={false} dim={s.dim ?? 0.15} />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* zona: um círculo tracejado que cresce, encolhe e some */}
        <Animated.View
          style={[
            styles.zone,
            {
              left: Animated.subtract(px(new Animated.Value(195), ox), Animated.multiply(zoneR, k)),
              top: Animated.subtract(px(new Animated.Value(430), oy), Animated.multiply(zoneR, k)),
              width: Animated.multiply(zoneR, 2 * k),
              height: Animated.multiply(zoneR, 2 * k),
              borderRadius: Animated.multiply(zoneR, k),
            },
          ]}
        />
        {s.roda ? <Roda at={at} lit={Math.floor(secs * 2) % 6} /> : null}
        {s.extra?.(at, beat)}
        {WHO.map((w) => {
          const p = s.people[w];
          return (
            <Animated.View key={w} style={{ position: 'absolute', left: px(pos[w].x, ox), top: px(pos[w].y, oy), opacity: vis[w] }}>
              {s.ping && p?.show !== false ? <Pulse /> : null}
              <Mark at={{ left: 0, top: 0 }} l={w === 'C' ? 'C' : w} kind={w === HUNTER ? 'hunter' : w === 'C' ? 'me' : 'runner'} ghost={p?.ghost} label={p?.label} />
            </Animated.View>
          );
        })}
      </View>

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
            boosts={null}
          />
        </View>
      ) : null}

      <View style={[styles.top, { paddingTop: Math.max(insets.top, 20) + 8 }]} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} pointerEvents="box-none">
          <View accessibilityRole="progressbar" accessibilityLabel={`Passo ${i + 1} de ${steps.length}`} style={{ flex: 1, flexDirection: 'row', gap: 4 }} pointerEvents="none">
            {steps.map((_, n) => (
              <View key={n} style={styles.seg}>
                <Animated.View
                  style={[styles.segFill, { width: n < i ? '100%' : n > i ? '0%' : last ? '100%' : fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
                />
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
          <View style={[styles.viewPill, s.view === 'caçador' ? { backgroundColor: PINK } : { backgroundColor: LIME }]}>
            <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, letterSpacing: 0.6, color: s.view === 'caçador' ? PAPER : INK }}>
              {s.view === 'caçador' ? 'MAPA DO CAÇADOR' : 'O SEU MAPA'}
            </Text>
          </View>
        </View>
      ) : null}

      {/* setas dos lados: mostram que dá para passar */}
      {i > 0 ? <Arrow side="left" top={top + room / 2 - 18} onPress={() => go(i - 1)} /> : null}
      {!last ? <Arrow side="right" top={top + room / 2 - 18} onPress={() => go(i + 1)} pulse={i === 0} /> : null}

      <View
        style={[styles.cardBox, { bottom: Math.max(insets.bottom, 16) + 12 }]}
        pointerEvents={last ? 'box-none' : 'none'}
        onLayout={(e) => setCardTop(e.nativeEvent.layout.y)}>
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

// Uma peça centrada no ponto.
function Spot({ at, children }: { at: { left: number; top: number }; children: ReactNode }) {
  return (
    <View style={{ position: 'absolute', left: at.left - 60, top: at.top - 60, width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}

// Uma pessoa no mapa (igual ao jogo): corredor verde, caçador com anel rosa, você com anel branco.
function Mark({ at, l = '', kind = 'runner', ghost, label }: { at: { left: number; top: number }; l?: string; kind?: 'runner' | 'hunter' | 'me'; ghost?: boolean; label?: string }) {
  const size = kind === 'me' ? 30 : 26;
  const look = ghost
    ? { backgroundColor: 'rgba(200,242,60,0.18)', borderColor: LIME, borderStyle: 'dashed' as const }
    : kind === 'hunter'
      ? { backgroundColor: INK, borderColor: PINK }
      : kind === 'me'
        ? { backgroundColor: LIME, borderColor: PAPER, boxShadow: '0 0 0 5px rgba(200,242,60,0.25)' }
        : { backgroundColor: LIME, borderColor: INK };
  return (
    <View style={{ position: 'absolute', left: at.left - 70, top: at.top - size / 2, width: 140, alignItems: 'center' }}>
      <View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center' }, look]}>
        <Text style={{ fontFamily: fonts.display, fontSize: 12, color: kind === 'hunter' && !ghost ? PAPER : ghost ? LIME : INK }}>{l}</Text>
      </View>
      {label ? (
        <View style={styles.tag}>
          <Text style={{ fontSize: 10, fontFamily: fonts.bodyStrong }} numberOfLines={1}>
            {label}
          </Text>
        </View>
      ) : null}
    </View>
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
      style={[
        styles.pulse,
        { opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.4] }) }] },
      ]}
    />
  );
}

// A roda: seis celulares em volta e a luz passando por eles.
function Roda({ at, lit }: { at: (x: number, y: number) => { left: number; top: number }; lit: number }) {
  return (
    <>
      {Array.from({ length: 6 }, (_, n) => {
        const a = (n / 6) * Math.PI * 2 - Math.PI / 2;
        const p = at(195 + Math.cos(a) * 112, 430 + Math.sin(a) * 112);
        const on = n === lit;
        return (
          <View
            key={n}
            style={[
              styles.phone,
              { left: p.left - 22, top: p.top - 36, transform: [{ rotate: `${(a * 180) / Math.PI + 90}deg` }] },
              on ? { backgroundColor: PINK, borderColor: PAPER, boxShadow: '0 0 30px 10px rgba(255,42,85,0.55)' } : null,
            ]}>
            <Text style={{ fontFamily: fonts.display, fontSize: 15, color: on ? PAPER : '#55606B' }}>{'CLJPTS'[n]}</Text>
          </View>
        );
      })}
      <Spot at={at(195, 430)}>
        <Sticker kind="hand" color={PINK} size={80} tilt={-10} />
      </Spot>
    </>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 16, right: 16, top: 0 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(243,240,232,0.25)', overflow: 'hidden' },
  segFill: { height: 4, borderRadius: 2, backgroundColor: PAPER },
  hudBox: { position: 'absolute', left: 0, right: 0, height: 250, transformOrigin: 'top center' },
  viewTag: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  viewPill: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 2, borderColor: INK },
  zone: { position: 'absolute', borderWidth: 3, borderStyle: 'dashed', borderColor: LIME, backgroundColor: 'rgba(200,242,60,0.10)' },
  arrowBox: { position: 'absolute' },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(11,15,19,0.78)', borderWidth: 2, borderColor: 'rgba(243,240,232,0.35)', alignItems: 'center', justifyContent: 'center' },
  cardBox: { position: 'absolute', left: 16, right: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 26,
    boxShadow: '4px 5px 0 #0B0F13',
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  cardSticker: { position: 'absolute', right: 16, top: -30 },
  kicker: { fontSize: 11, fontFamily: fonts.bodyStrong, letterSpacing: 0.9 },
  title: { fontFamily: fonts.display, fontSize: 27, lineHeight: 28, letterSpacing: -0.5, color: INK, marginTop: 4, paddingRight: 44 },
  body: { fontSize: 14, lineHeight: 20, color: INK, opacity: 0.75, marginTop: 8 },
  more: { fontSize: 12, fontFamily: fonts.bodyStrong, color: INK, opacity: 0.45, marginTop: 12 },
  link: { fontSize: 13, fontFamily: fonts.bodyStrong, color: INK, opacity: 0.6, paddingVertical: 4 },
  qr: { height: 56, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: INK, boxShadow: '3px 4px 0 #0B0F13', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  tag: { marginTop: 4, backgroundColor: INK, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 },
  pulse: { position: 'absolute', left: -15, top: -15, width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: PINK },
  rescue: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderStyle: 'dashed', backgroundColor: 'rgba(200,242,60,0.12)' },
  phone: { position: 'absolute', width: 44, height: 72, borderRadius: 12, backgroundColor: '#1A2027', borderWidth: 3, borderColor: '#2A333D', alignItems: 'center', justifyContent: 'center' },
});
