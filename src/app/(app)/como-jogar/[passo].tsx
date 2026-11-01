import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ArcHud, type ArcStatus } from '@/components/ArcHud';
import { BENTO, Sticker, type StickerKind } from '@/components/Bento';
import { BoostSticker, type BoostKind } from '@/components/Boosts';
import { Button } from '@/components/Button';
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from '@/components/icons';
import { Appear, Pressy } from '@/components/Motion';
import { Text } from '@/components/Text';
import { routeMs, TutorialMap } from '@/components/TutorialMap';
import type { TutorialMark, TutorialMover } from '@/components/tutorialMapTypes';
import { useCreateGame } from '@/lib/game';
import { NARRATION, narrationOn, narrationPosition, narrationSpeed, onNarrationEnd, pauseNarration, playNarration, resumeNarration, setNarrationOn, setNarrationSpeed, stopNarration } from '@/lib/narration';
import { useScreenInsets } from '@/lib/screenInsets';
import { TUTORIAL_CENTER, TUTORIAL_ROUTES, TUTORIAL_SPOTS, type LngLat, type Who } from '@/lib/tutorialRoutes';
import { colors, fonts } from '@/theme/tokens';

// 24 Como jogar (antes da partida), versão 3: uma partida contada no mapa de
// ruas de verdade. A câmera voa e dá zoom a cada passo, as pessoas correm pelas
// ruas, a zona cresce e encolhe, e cada boost é pego e mostrado funcionando.
// Em cima, o placar real do jogo. Passa sozinho; segurar pausa; setas dos lados.
// Uma narradora fala cada passo (src/lib/narration); o passo dura o tempo da fala.

const PAPER = colors.paper;
const LIME = colors.lime;
const PINK = colors.pink;
const INK = BENTO.ink;
const STEP_MS = 8500;
const WHO: Who[] = ['C', 'L', 'P', 'T', 'S'];
// Segurar o dedo pausa: sem isso o iPhone entra em seleção de texto (lupa e
// marcadores azuis) e o Android abre o menu de copiar.
const NO_SELECT = Platform.OS === 'web' ? ({ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as object) : null;
const CENTER: LngLat = [TUTORIAL_CENTER.lng, TUTORIAL_CENTER.lat];
type Spot = keyof typeof TUTORIAL_SPOTS;
const spot = (k: Spot): LngLat => [TUTORIAL_SPOTS[k][0], TUTORIAL_SPOTS[k][1]];
const mid = (a: LngLat, b: LngLat): LngLat => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

type Hud = { timeLabel: string; time: number; pingLabel: string; ping: number; progress: number; free: number; zone: number; zoneNote: string; status: ArcStatus; statusLabel: string };
type Extra = 'lock' | 'ghost' | 'fake' | 'shield' | 'heart' | 'mega' | 'hand' | 'rescue' | 'question';
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

// O que pode mudar no meio de um passo, no ritmo da fala.
type Look = Partial<Pick<Step, 'hidden' | 'labels' | 'jailed' | 'pulse' | 'extras' | 'zone' | 'held'>> & { status?: ArcStatus; statusLabel?: string; used?: boolean; litStop?: number };
type Timeline = { beats?: { at: number; set: Look }[]; delays?: Partial<Record<Who, number>> }; // at/delays: fração da fala (0 a 1)

const H = (o: Partial<Hud>): Hud => ({ timeLabel: 'Tempo restante', time: 28 * 60, pingLabel: 'ping em', ping: 60, progress: 0.5, free: 4, zone: 300, zoneNote: 'diâmetro', status: 'hidden', statusLabel: 'Ninguém te vê agora', ...o });

const steps: Step[] = [
  {
    roda: true,
    dim: 0.55,
    kicker: 'A RODA',
    tone: PINK,
    title: 'Juntem os celulares.',
    body: 'Pra começar, todo mundo coloca o celular no meio da roda. Uma luz vai passando de celular em celular e para em quem vai ser o caçador. É sorteio: ninguém escolhe. Quem não for caçador é corredor.',
    sticker: ['crew', LIME],
    camera: { center: CENTER, zoom: 13.6 },
    zone: 0,
    hidden: WHO,
  },
  {
    kicker: 'A ZONA',
    tone: '#5E8C00',
    title: 'O jogo acontece aqui.',
    body: 'Quem cria a partida marca um círculo no mapa: essa é a zona. O jogo acontece só aqui dentro, nas ruas de verdade. Todo mundo começa junto, no meio.',
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
    body: 'Quando a partida começa, os corredores saem correndo pra se esconder. O caçador fica travado no meio por um minuto, sem ver ninguém no mapa. Essa é a sua vantagem: use pra se afastar.',
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
    body: 'Acabou a vantagem, o caçador sai procurando. Mas, no mapa dele, os corredores não aparecem. Ele não sabe onde ninguém está.',
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
    body: 'A cada dois minutos acontece o ping. Nessa hora, o caçador vê no mapa onde cada corredor estava naquele exato segundo. É a pista que ele tem pra ir atrás de você.',
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
    body: 'Mas o ping é só uma foto. Se você continuar andando, o caçador vai até o lugar onde você estava, e você já não está mais lá. Por isso, logo depois de cada ping, mude de lugar.',
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
    body: 'Durante a partida aparecem boosts pelas ruas, só no mapa dos corredores. Pra pegar, é só passar em cima. Você pode guardar até dois e usar quando quiser. Mas atenção: ao usar um boost, o caçador te vê ao vivo por alguns segundos.',
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
    body: 'O Despiste faz o seu próximo ping aparecer a sessenta metros do lugar certo. O caçador corre pro ponto falso, enquanto você está em outro lugar. Ao usar, ele te vê por dois segundos.',
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
    body: 'A Sombra faz você sumir do próximo ping. Todo mundo aparece no mapa do caçador, menos você. Ao usar, ele te vê por cinco segundos.',
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
    body: 'O Escudo te protege por dois minutos. Mesmo que o caçador te alcance, ele não consegue te pegar. Ao usar, ele te vê por oito segundos.',
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
    body: 'Quando um caçador chega perto, o seu celular vibra como um coração acelerado: é hora de sair daí. E o caçador tem uma carta na manga: ele pode fazer o seu celular gritar, pra te achar pelo som.',
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
    body: 'A cada cinco minutos, a zona diminui. Se você ficar fora dela por trinta segundos, os caçadores passam a te ver ao vivo até você voltar. Fique sempre de olho no círculo.',
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
    body: 'Pra pegar alguém, o caçador precisa encostar na pessoa de verdade. Quem foi pego confirma no app e fica preso. Mas dá pra ser salvo: se um amigo chegar perto e ficar ali alguns segundos, você volta pro jogo.',
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
    body: 'Ganha quem ainda estiver livre quando o tempo acabar, ou o caçador, se pegar todo mundo. Agora é com você: junte pelo menos três amigos, crie uma partida e chame a galera pelo QR. Bora jogar!',
    sticker: ['run', LIME],
    camera: { center: CENTER, zoom: 14.4 },
    zone: 150,
    hidden: WHO,
  },
];

// Linha do tempo de cada passo (mesma ordem do roteiro): o que acontece no
// mapa enquanto a narradora fala. "at" e "delays" são frações da fala.
const RUNNERS: Who[] = ['C', 'P', 'T', 'S'];
const TIMELINE: Timeline[] = [
  // 0 roda: a luz gira e para no caçador quando ela diz "para em quem vai ser o caçador"
  { beats: [{ at: 0.45, set: { litStop: 1 } }] },
  // 1 zona: a zona cresce; todo mundo aparece no meio no "todo mundo começa junto"
  { beats: [{ at: 0, set: { hidden: WHO } }, { at: 0.72, set: { hidden: [] } }] },
  // 2 vantagem: os corredores saem correndo logo no "saem correndo"
  { delays: { C: 0.12, P: 0.12, T: 0.12, S: 0.12 } },
  // 3 escondidos: o caçador sai procurando; no "os corredores não aparecem"
  //   surgem interrogações pelo mapa, e no "não sabe onde ninguém está" uma na cabeça dele
  {
    delays: { L: 0.12 },
    beats: [
      { at: 0.4, set: { extras: [{ kind: 'question', at: spot('nw') }, { kind: 'question', at: spot('se') }] } },
      { at: 0.55, set: { extras: [{ kind: 'question', at: spot('nw') }, { kind: 'question', at: spot('se') }, { kind: 'question', at: spot('ne') }, { kind: 'question', at: spot('sw') }] } },
      {
        at: 0.7,
        set: {
          extras: [
            { kind: 'question', at: spot('nw') },
            { kind: 'question', at: spot('se') },
            { kind: 'question', at: spot('ne') },
            { kind: 'question', at: spot('sw') },
            { kind: 'question', at: spot('despiste') },
            { kind: 'question', at: spot('norte'), on: 'L' },
          ],
        },
      },
    ],
  },
  // 4 ping: no "nessa hora" todo mundo pisca no mapa do caçador
  { beats: [{ at: 0, set: { hidden: RUNNERS, pulse: [] } }, { at: 0.3, set: { hidden: [], pulse: RUNNERS } }] },
  // 5 rastro: você sai andando; depois o caçador vai até onde você estava
  { delays: { C: 0.2, L: 0.45 } },
  // 6 boosts: você corre e pega no "é só passar em cima"; no "ao usar um boost"
  //   você usa e o caçador aparece te vendo ao vivo
  {
    delays: { C: 0.22 },
    beats: [
      {
        at: 0.7,
        set: {
          used: true,
          hidden: ['P', 'T', 'S'],
          pulse: ['C'],
          labels: { C: 'ao vivo · 2 s', L: 'te vendo!' },
          status: 'off',
          statusLabel: 'O caçador te vê agora',
        },
      },
    ],
  },
  // 7 despiste: o ping falso aparece, e o caçador corre para ele
  {
    delays: { L: 0.42 },
    beats: [
      { at: 0, set: { extras: [] } },
      { at: 0.28, set: { extras: [{ kind: 'fake', at: spot('pingFalso') }] } },
    ],
  },
  // 8 sombra: no "todo mundo aparece" os outros piscam e você não
  { beats: [{ at: 0, set: { pulse: [] } }, { at: 0.3, set: { pulse: ['P', 'T', 'S'] } }] },
  // 9 escudo: o caçador te alcança e não consegue
  { delays: { L: 0.25 }, beats: [{ at: 0, set: { labels: { C: 'você · escudo' } } }, { at: 0.62, set: { labels: { C: 'você · escudo', L: 'não dá!' } } }] },
  // 10 perto: o coração bate; no "pode fazer o seu celular gritar" aparece o grito
  { beats: [{ at: 0, set: { extras: [{ kind: 'heart', at: spot('pertoEscudo'), on: 'C' }] } }, { at: 0.55, set: { extras: [{ kind: 'heart', at: spot('pertoEscudo'), on: 'C' }, { kind: 'mega', at: spot('coracao'), on: 'L' }] } }] },
  // 11 cerco: a zona aperta no "a zona diminui"; depois quem ficou fora é marcado
  { beats: [{ at: 0, set: { zone: 150, labels: { C: 'você' } } }, { at: 0.12, set: { zone: 105 } }, { at: 0.45, set: { labels: { C: 'você', P: 'fora · 0:30' } } }] },
  // 12 pega-pega: o caçador encosta, ela fica presa, você vai salvar
  {
    delays: { C: 0.55 },
    beats: [
      { at: 0, set: { jailed: [], labels: { C: 'você' }, extras: [{ kind: 'hand', at: spot('nw') }] } },
      { at: 0.38, set: { jailed: ['P'], labels: { C: 'você', P: 'presa' } } },
      { at: 0.72, set: { labels: { C: 'você · salvando', P: 'presa' }, extras: [{ kind: 'hand', at: spot('nw') }, { kind: 'rescue', at: spot('nw') }] } },
    ],
  },
  // 13 sua vez
  {},
];

export default function ComoJogar() {
  const { passo = '1' } = useLocalSearchParams<{ passo?: string; de?: string }>();
  const insets = useScreenInsets();
  const create = useCreateGame();
  const { width: W, height: Hh } = useWindowDimensions();
  const [i, setI] = useState(() => Math.min(Math.max(Number(passo) - 1 || 0, 0), steps.length - 1));
  const [paused, setPaused] = useState(false);
  // Onde o cartão começa = altura da tela - (altura do cartão + margem de baixo).
  // As duas alturas são medidas: no celular a tela encolhe quando as barras do
  // navegador aparecem, o cartão sobe junto sem mudar de tamanho (e sem avisar),
  // e a ação do mapa descia para trás dele.
  const [rootH, setRootH] = useState(Hh);
  const [cardH, setCardH] = useState(240);
  const cardBottom = Math.max(insets.bottom, 16) + 12;
  const cardTop = rootH - cardBottom - cardH;
  const s = steps[i];
  const last = i === steps.length - 1;
  const [sound, setSound] = useState(() => narrationOn());
  // Velocidade do tutorial: 1x, 1,5x ou 2x (voz, digitação, mapa e passos).
  const [rate, setRate] = useState(() => narrationSpeed());
  useEffect(() => setNarrationSpeed(rate), [rate]);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  // Com fala, o passo dura o tempo dela + uma folga para olhar o mapa.
  // Sem áudio, o tempo da fala é estimado pelo tamanho do texto (~15 letras por segundo).
  const sayMs = NARRATION[i]?.ms ?? Math.round(s.body.length * 66);
  const stepMs = last ? STEP_MS : sayMs + 350;

  useEffect(() => {
    if (sound) playNarration(i);
    else stopNarration();
  }, [i, sound]);
  useEffect(() => () => stopNarration(), []);
  // E sem o menu do toque longo (copiar, pesquisar) enquanto o tutorial está aberto.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const block = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    document.addEventListener('selectstart', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('selectstart', block);
    };
  }, []);
  useEffect(() => {
    if (!sound) return;
    if (paused) pauseNarration();
    else resumeNarration();
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Relógio do passo (100 ms, pausa junto): comanda a digitação, os momentos
  // da linha do tempo e o tempo do placar, que desce de verdade.
  const [ms, setMs] = useState(0);
  const msRef = useRef(0);
  const iRef = useRef(i);
  iRef.current = i;
  useEffect(() => {
    msRef.current = 0;
    setMs(0);
  }, [i]);
  useEffect(() => {
    if (paused) return;
    let before = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      // Com a fala tocando, o relógio segue a voz (no celular ela pode começar atrasada).
      const voice = sound ? narrationPosition(iRef.current) : null;
      msRef.current = voice ?? msRef.current + (now - before) * rateRef.current;
      before = now;
      setMs(msRef.current);
    }, 100);
    return () => clearInterval(id);
  }, [paused, sound]);
  const secs = ms / 1000;
  const beat = Math.floor(ms / 500) % 2 === 1;

  // O jeito do passo agora: o roteiro + os momentos da fala que já passaram.
  const tl = TIMELINE[i] ?? {};
  const v: Look = { hidden: s.hidden, labels: s.labels, jailed: s.jailed, pulse: s.pulse, extras: s.extras, zone: s.zone, held: s.held };
  for (const b of tl.beats ?? []) if (ms >= b.at * sayMs) Object.assign(v, b.set);
  const delayOf = (w: Who) => Math.round((tl.delays?.[w] ?? 0) * sayMs);

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
    const anim = Animated.timing(fill, { toValue: 1, duration: (stepMs / rate) * (1 - fillAt.current), easing: Easing.linear, useNativeDriver: false });
    // Com som, quem vira o passo é o fim da fala (abaixo); a barrinha só garante, com folga, se o áudio falhar.
    anim.start(({ finished }) => finished && (!sound || !NARRATION[i]) && go(i + 1));
    return () => anim.stop();
  }, [i, paused, last, rate]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (n: number) => setI(Math.min(Math.max(n, 0), steps.length - 1));

  // Troca suave: guarda o passo que está saindo para o cartão dele sumir devagar.
  const [leaving, setLeaving] = useState<number | null>(null);
  const out = useRef(new Animated.Value(0)).current;
  const prevI = useRef(i);
  useEffect(() => {
    if (prevI.current === i) return;
    setLeaving(prevI.current);
    prevI.current = i;
    out.setValue(1);
    Animated.timing(out, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => finished && setLeaving(null));
  }, [i, out]);

  // A fala acabou de verdade: vira o passo logo em seguida.
  useEffect(
    () =>
      onNarrationEnd((step) => {
        if (step === iRef.current && step < steps.length - 1) setTimeout(() => iRef.current === step && go(step + 1), 350);
      }),
    [],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  // Se o áudio não tocar (bloqueado, sem internet), o passo vira pelo relógio com folga.
  useEffect(() => {
    if (!sound || !NARRATION[i] || last || paused) return;
    if (ms > sayMs + 2500) go(i + 1);
  }, [ms]); // eslint-disable-line react-hooks/exhaustive-deps
  const leave = () => router.replace('/');

  // Espaço livre para o mapa mostrar a ação: entre o placar e o cartão.
  const hudScale = 0.74;
  const top = Math.max(insets.top, 20) + 30 + (s.hud ? 205 * hudScale : 0) + (s.view ? 34 : 0);
  const padding = useMemo(() => ({ top, bottom: Math.max(0, rootH - cardTop + 24), left: 30, right: 30 }), [top, rootH, cardTop]);
  const freeMid = top + Math.max(120, cardTop - 24 - top) / 2;

  // Quem anda por onde neste passo.
  const routes = TUTORIAL_ROUTES[i];
  const movers: TutorialMover[] = WHO.map((w) => ({
    id: w,
    route: routes[w],
    runKey: `${i}-${w}`,
    delay: delayOf(w),
    zIndex: w === 'C' ? 10 : w === 'L' ? 8 : 5,
    node: (
      <Person
        who={w}
        hidden={v.hidden?.includes(w)}
        label={v.labels?.[w]}
        jailed={v.jailed?.includes(w)}
        pulse={v.pulse?.includes(w)}
        shield={v.extras?.some((e) => e.kind === 'shield' && e.on === w)}
        heart={v.extras?.some((e) => e.kind === 'heart' && e.on === w) ? beat : undefined}
        mega={v.extras?.some((e) => e.kind === 'mega' && e.on === w) ? beat : undefined}
        question={v.extras?.some((e) => e.kind === 'question' && e.on === w)}
      />
    ),
  }));
  const cArrives = delayOf('C') + routeMs(routes.C);
  const marks: TutorialMark[] = [
    ...(s.boostsOnMap ?? []).map((b) => ({
      id: `b-${i}-${b.kind}`,
      at: spot(b.at),
      zIndex: 3,
      node: <MapBoost kind={b.kind} pickAt={b.picked ? cArrives / rate : undefined} />,
    })),
    ...(v.extras ?? [])
      .filter((e) => !e.on)
      .map((e, n) => ({ id: `e-${i}-${n}`, at: e.at, zIndex: e.kind === 'rescue' ? 1 : e.kind === 'fake' ? 9 : 2, node: <ExtraMark kind={e.kind} /> })),
  ];

  const time = s.hud ? Math.max(0, s.hud.time - Math.floor(secs)) : 0;
  const ping = s.hud ? Math.max(0, s.hud.ping - Math.floor(secs)) : 0;
  const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  // O boost pego vai para o placar depois que a pessoa chega nele.
  const pickedNow = (s.boostsOnMap ?? []).filter((b) => b.picked && secs * 1000 > cArrives + 300).map((b) => b.kind);
  // Usou o boost: ele sai do placar.
  const held = (v.used ? [] : [...new Set([...(v.held ?? []), ...pickedNow])]).map((kind) => ({ id: `h-${kind}`, kind }));

  return (
    <View style={[{ flex: 1, backgroundColor: colors.inkSunken }, NO_SELECT]} onLayout={(e) => setRootH(Math.round(e.nativeEvent.layout.height))}>
      <TutorialMap camera={s.camera} padding={padding} zoneRadius={v.zone ?? 0} movers={movers} marks={marks} rate={rate} />
      {s.dim ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(11,14,17,${s.dim})` }]} /> : null}
      {s.roda ? <Roda cx={W / 2} cy={freeMid} lit={v.litStop ?? Math.floor(secs * 3) % 6} /> : null}
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
            status={v.status ?? s.hud.status}
            statusLabel={v.statusLabel ?? s.hud.statusLabel}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Velocidade ${rate}x. Trocar`}
            onPress={() => setRate((r) => (r === 1 ? 1.5 : r === 1.5 ? 2 : 1))}
            hitSlop={8}
            style={[styles.speedBtn, rate !== 1 && { backgroundColor: LIME }]}>
            <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, color: rate !== 1 ? INK : PAPER }}>{rate === 1.5 ? '1,5x' : `${rate}x`}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sound ? 'Desligar a narração' : 'Ligar a narração'}
            onPress={() => {
              setNarrationOn(!sound);
              setSound(!sound);
            }}
            hitSlop={10}
            style={styles.soundBtn}>
            {sound ? <Volume2 size={16} color={PAPER} strokeWidth={2.4} /> : <VolumeX size={16} color={BENTO.muted} strokeWidth={2.4} />}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={leave} hitSlop={12}>
            <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong }}>{last ? 'OK' : 'Pular'}</Text>
          </Pressable>
        </View>
      </View>

      {s.view ? (
        <Appear key={`v${i}`} style={[styles.viewTag, { top: top - 30 }]}>
          <View style={[styles.viewPill, { backgroundColor: s.view === 'caçador' ? PINK : LIME }]}>
            <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, letterSpacing: 0.6, color: s.view === 'caçador' ? PAPER : INK }}>
              {s.view === 'caçador' ? 'MAPA DO CAÇADOR' : 'O SEU MAPA'}
            </Text>
          </View>
        </Appear>
      ) : null}

      {i > 0 ? <Arrow side="left" top={freeMid - 18} onPress={() => go(i - 1)} /> : null}
      {!last ? <Arrow side="right" top={freeMid - 18} onPress={() => go(i + 1)} pulse={i === 0} /> : null}

      <View style={[styles.cardBox, { bottom: cardBottom }]} pointerEvents={last ? 'box-none' : 'none'} onLayout={(e) => setCardH(Math.round(e.nativeEvent.layout.height))}>
        {leaving !== null ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.card, styles.cardLeaving, { opacity: out, transform: [{ translateY: out.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }, { scale: out.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }]}>
            <View style={styles.cardSticker}>
              <Sticker kind={steps[leaving].sticker[0]} color={steps[leaving].sticker[1]} size={56} tilt={-8} />
            </View>
            <Text style={[styles.kicker, { color: steps[leaving].tone }]}>{steps[leaving].kicker}</Text>
            <Text style={styles.title}>{steps[leaving].title}</Text>
            <Text style={styles.body}>{steps[leaving].body}</Text>
          </Animated.View>
        ) : null}
        <Appear key={i} delay={leaving !== null ? 230 : 0} distance={22} style={styles.card}>
          <View style={styles.cardSticker} pointerEvents="none">
            <Sticker kind={s.sticker[0]} color={s.sticker[1]} size={56} tilt={-8} />
          </View>
          <Text style={[styles.kicker, { color: s.tone }]}>{s.kicker}</Text>
          <Text style={styles.title}>{s.title}</Text>
          <Typed text={s.body} ms={sayMs} t={ms} />
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

// Texto que vai sendo digitado no ritmo da fala, com um cursor piscando.
// O texto inteiro fica invisível por baixo para o cartão já nascer com a altura
// final (senão o cartão cresceria e o mapa ficaria pulando).
function Typed({ text, ms, t }: { text: string; ms: number; t: number }) {
  const shown = text.slice(0, Math.ceil((text.length * Math.min(t, ms)) / ms));
  const typing = shown.length < text.length;
  return (
    <View>
      <Text style={[styles.body, { opacity: 0 }]}>{text}</Text>
      <Text style={[styles.body, StyleSheet.absoluteFill]}>
        {shown}
        {typing ? <Text style={{ color: PINK, opacity: Math.floor(t / 300) % 2 ? 0 : 1 }}>▍</Text> : null}
      </Text>
    </View>
  );
}

// Uma pessoa no mapa: corredor verde, caçador com anel rosa, você com anel branco.
function Person({ who, hidden, label, jailed, pulse, shield, heart, mega, question }: { who: Who; hidden?: boolean; label?: string; jailed?: boolean; pulse?: boolean; shield?: boolean; heart?: boolean; mega?: boolean; question?: boolean }) {
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
      {question ? (
        <View style={{ position: 'absolute', left: -15, top: -58 }}>
          <Question big />
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
  if (kind === 'question')
    return (
      <View style={{ width: 0, height: 0 }}>
        <View style={{ position: 'absolute', left: -13, top: -13 }}>
          <Question />
        </View>
      </View>
    );
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

// Ponto de interrogação de figurinha: surge com um pulo e fica flutuando.
function Question({ big }: { big?: boolean }) {
  const enter = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const phase = useRef(Math.random() * 600).current;
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 700 + phase, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 700 + phase, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enter, float, phase]);
  const size = big ? 30 : 26;
  return (
    <Animated.View
      style={[
        styles.question,
        { width: size, height: size, borderRadius: size / 2 },
        big ? { backgroundColor: PINK } : null,
        {
          opacity: enter,
          transform: [
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
            { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
            { rotate: float.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '10deg'] }) },
          ],
        },
      ]}>
      <Text style={{ fontFamily: fonts.display, fontSize: big ? 19 : 16, lineHeight: big ? 22 : 19, color: big ? PAPER : INK }}>?</Text>
    </Animated.View>
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
  viewTag: { position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' },
  viewPill: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 2, borderColor: INK },
  arrowBox: { position: 'absolute' },
  question: { backgroundColor: '#FFC23D', borderWidth: 2.5, borderColor: INK, boxShadow: '2px 3px 0 #0B0F13', alignItems: 'center', justifyContent: 'center' },
  speedBtn: { height: 30, minWidth: 40, paddingHorizontal: 8, borderRadius: 15, backgroundColor: 'rgba(11,15,19,0.7)', alignItems: 'center', justifyContent: 'center' },
  soundBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(11,15,19,0.7)', alignItems: 'center', justifyContent: 'center' },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(11,15,19,0.78)', borderWidth: 2, borderColor: 'rgba(243,240,232,0.35)', alignItems: 'center', justifyContent: 'center' },
  cardBox: { position: 'absolute', left: 16, right: 16 },
  cardLeaving: { position: 'absolute', left: 0, right: 0, bottom: 0 },
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
