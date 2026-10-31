import { router, useLocalSearchParams } from 'expo-router';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { BENTO, Sticker, type StickerKind } from '@/components/Bento';
import { BoostSticker } from '@/components/Boosts';
import { Button } from '@/components/Button';
import { MapBackdrop } from '@/components/MapBackdrop';
import { Appear, Pressy } from '@/components/Motion';
import { Text } from '@/components/Text';
import { useCreateGame } from '@/lib/game';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts } from '@/theme/tokens';

// 24.1 a 24.10 Como jogar (antes da partida): passos curtos tipo stories em
// cima do mapa. Toque para avançar (no terço esquerdo, volta). Alguns passos
// têm o seletor Corredor / Caçador para ver o mesmo momento dos dois lados.

type Side = 'runner' | 'hunter';
type Face = { kicker: string; tone: string; title: string; body: string; sticker: [StickerKind, string]; hud?: [string, string, string?][] };
type Step = { face: Face; hunterFace?: Face; side?: Side; dim?: number; art: (side: Side, tick: number) => ReactNode };
type At = { left: number; top: number };

const PAPER = colors.paper;
const LIME = colors.lime;
const PINK = colors.pink;
const INK = BENTO.ink;

// Espaço livre para o desenho: entre o topo (barrinha, placar, seletor) e o cartão.
const Free = createContext({ top: 200, bottom: 600 });

const zoneCircle = (r = 150, cy = 430) => <Circle cx={195} cy={cy} r={r} fill="rgba(200,242,60,0.10)" stroke={LIME} strokeWidth={4} strokeDasharray="14 10" />;

const steps: Step[] = [
  {
    dim: 0.55,
    face: { kicker: 'A RODA', tone: PINK, title: 'Juntem os celulares.', body: 'Uma luz passa de celular em celular e para em quem vai caçar. Ninguém escolhe, é sorte.', sticker: ['crew', LIME] },
    art: (_, tick) => <Roda lit={tick % 6} />,
  },
  {
    face: { kicker: 'A ZONA', tone: '#5E8C00', title: 'O jogo acontece aqui.', body: 'Quem cria a partida marca um círculo no mapa. Todo mundo joga dentro dele, nas ruas de verdade.', sticker: ['pin', '#FFC23D'] },
    art: () => (
      <Layer svg={zoneCircle()}>
        {(at) => (
          <>
            <Spot at={at(195, 412)}>
              <Sticker kind="pin" color={PINK} size={48} tilt={0} />
            </Spot>
            <Spot at={at(195, 610)}>
              <View style={styles.chip}>
                <Text style={{ fontSize: 13, color: INK, opacity: 0.6 }}>
                  Zona <Text style={{ fontSize: 14, fontFamily: fonts.display, color: INK }}>600 m</Text>
                </Text>
              </View>
            </Spot>
          </>
        )}
      </Layer>
    ),
  },
  {
    side: 'runner',
    face: {
      kicker: 'VANTAGEM',
      tone: '#5E8C00',
      title: 'Corra e se esconda.',
      body: 'Os corredores saem na frente. Por 1 minuto o caçador fica travado, sem ver ninguém.',
      sticker: ['run', LIME],
      hud: [['VANTAGEM', '0:42', LIME], ['CAÇADOR', 'travado']],
    },
    hunterFace: {
      kicker: 'VANTAGEM',
      tone: PINK,
      title: 'Espere travado.',
      body: 'Por 1 minuto você não vê ninguém nem pode sair. Use esse tempo para combinar com o seu time.',
      sticker: ['lock', '#FFC23D'],
      hud: [['VANTAGEM', '0:42', PINK], ['VOCÊ', 'travado']],
    },
    art: (side) => (
      <Layer
        svg={
          <>
            {side === 'runner'
              ? [
                  [110, 330],
                  [290, 360],
                  [140, 520],
                  [262, 505],
                ].map(([x, y]) => <Line key={x} x1={195} y1={430} x2={x} y2={y} stroke={LIME} strokeWidth={3} strokeDasharray="4 8" strokeLinecap="round" opacity={0.7} />)
              : null}
            {zoneCircle()}
          </>
        }>
        {(at) =>
          side === 'runner' ? (
            <>
              <Who at={at(110, 330)} l="L" />
              <Who at={at(290, 360)} l="P" />
              <Who at={at(140, 520)} l="T" />
              <Who at={at(262, 505)} l="C" kind="me" label="você" />
              <Spot at={at(195, 430)}>
                <Sticker kind="lock" color="#FFC23D" size={40} tilt={-6} />
              </Spot>
            </>
          ) : (
            <>
              <Who at={at(195, 440)} l="C" kind="hunter" label="você" />
              <Spot at={at(195, 380)}>
                <Sticker kind="lock" color="#FFC23D" size={48} tilt={-6} />
              </Spot>
            </>
          )
        }
      </Layer>
    ),
  },
  {
    side: 'hunter',
    face: {
      kicker: 'O PING',
      tone: '#1E8FD0',
      title: 'Fique de olho no ping.',
      body: 'A cada 2 min o caçador vê onde você está naquele segundo. Depois do ping, mude de lugar.',
      sticker: ['radar', '#5AC8FA'],
      hud: [['PRÓXIMO PING', 'agora', LIME], ['RODADA', '28:00']],
    },
    hunterFace: {
      kicker: 'O PING',
      tone: '#1E8FD0',
      title: 'A cada 2 min, todo mundo aparece.',
      body: 'Ele mostra onde cada corredor estava naquele segundo. No resto do tempo, o seu mapa fica vazio.',
      sticker: ['radar', '#5AC8FA'],
      hud: [['PRÓXIMO PING', 'agora', PINK], ['RODADA', '28:00']],
    },
    art: (side, tick) => {
      const spots: [number, number, string][] = [
        [118, 342, 'L'],
        [286, 372, 'P'],
        [150, 512, 'T'],
        [255, 488, 'S'],
      ];
      const r = 30 + (tick % 4) * 8;
      return (
        <Layer
          svg={
            <>
              {zoneCircle()}
              {spots.map(([x, y]) => (
                <Circle key={x} cx={x} cy={y} r={r} fill="none" stroke={PINK} strokeWidth={3} opacity={0.6 - (tick % 4) * 0.12} />
              ))}
            </>
          }>
          {(at) => (
            <>
              {spots.map(([x, y, l]) => (side === 'runner' && l === 'S' ? null : <Who key={l} at={at(x, y)} l={l} label="agora" />))}
              {side === 'runner' ? <Who at={at(255, 488)} l="C" kind="me" label="você · visto agora" /> : <Who at={at(198, 420)} l="C" kind="hunter" label="você" />}
            </>
          )}
        </Layer>
      );
    },
  },
  {
    side: 'runner',
    face: {
      kicker: 'RASTRO',
      tone: '#8A4FE0',
      title: 'O ping é só uma foto.',
      body: 'Se você continuar andando, o caçador vai atrás de onde você estava. Mexa-se depois de cada ping.',
      sticker: ['ghost', '#B57CFF'],
      hud: [['PRÓXIMO PING', '1:10', LIME], ['RODADA', '27:10']],
    },
    hunterFace: {
      kicker: 'RASTRO',
      tone: '#8A4FE0',
      title: 'Ela já pode ter ido.',
      body: 'O ping mostra onde a pessoa estava. Corra para lá, mas pense para onde ela foi depois.',
      sticker: ['ghost', '#B57CFF'],
      hud: [['PRÓXIMO PING', '1:10', PINK], ['RODADA', '27:10']],
    },
    art: (side) => (
      <Layer
        svg={
          <>
            {zoneCircle()}
            {side === 'runner' ? <Path d="M150 500 C175 470 230 470 262 420" fill="none" stroke={LIME} strokeWidth={3} strokeDasharray="4 8" strokeLinecap="round" /> : null}
            <Path d="M110 560 C125 540 140 520 150 500" fill="none" stroke={PINK} strokeWidth={3} strokeDasharray="4 8" strokeLinecap="round" />
          </>
        }>
        {(at) => (
          <>
            <Who at={at(150, 500)} l="" kind="ghost" label="ping de 1 min atrás" />
            <Spot at={at(128, 470)}>
              <Sticker kind="ghost" color="#B57CFF" size={40} tilt={-8} />
            </Spot>
            {side === 'runner' ? <Who at={at(262, 420)} l="C" kind="me" label="você agora" /> : null}
            <Who at={at(110, 560)} l={side === 'runner' ? 'L' : 'C'} kind="hunter" label={side === 'runner' ? 'indo pro ping' : 'você'} />
          </>
        )}
      </Layer>
    ),
  },
  {
    face: {
      kicker: 'BOOSTS',
      tone: '#1E8FD0',
      title: 'Pegue boosts nas ruas.',
      body: 'Despiste, Sombra e Escudo te ajudam a fugir. O preço: os caçadores te veem por alguns segundos.',
      sticker: ['shield', '#5AC8FA'],
      hud: [['SEUS BOOSTS', '1 de 2', LIME], ['RODADA', '24:30']],
    },
    art: () => (
      <Layer svg={zoneCircle()}>
        {(at) => (
          <>
            <Spot at={at(118, 352)}>
              <BoostSticker kind="despiste" size={44} edge />
            </Spot>
            <Spot at={at(272, 402)}>
              <BoostSticker kind="sombra" size={44} edge />
            </Spot>
            <Spot at={at(192, 522)}>
              <BoostSticker kind="escudo" size={44} edge />
            </Spot>
            <Who at={at(150, 560)} l="C" kind="me" label="você" />
          </>
        )}
      </Layer>
    ),
  },
  {
    side: 'runner',
    face: {
      kicker: 'PERTO DEMAIS',
      tone: PINK,
      title: 'Seu coração acelera.',
      body: 'Quando um caçador chega perto, seu celular avisa. E ele pode fazer o seu celular gritar para te achar.',
      sticker: ['heart', PINK],
      hud: [['PRÓXIMO PING', '0:40', LIME], ['RODADA', '22:05']],
    },
    hunterFace: {
      kicker: 'PERTO DEMAIS',
      tone: PINK,
      title: 'Chegou perto? Grite.',
      body: 'Toque em Grito e o celular do corredor mais perto faz barulho. Escute e vá atrás.',
      sticker: ['mega', '#FFC23D'],
      hud: [['PRÓXIMO PING', '0:40', PINK], ['RODADA', '22:05']],
    },
    art: (side, tick) => (
      <Layer
        svg={
          <>
            {zoneCircle()}
            <Circle cx={215} cy={455} r={62 + (tick % 2) * 8} fill="rgba(255,42,85,0.16)" stroke={PINK} strokeWidth={2} strokeDasharray="6 6" />
          </>
        }>
        {(at) => (
          <>
            <Who at={at(215, 455)} l={side === 'runner' ? 'C' : 'P'} kind={side === 'runner' ? 'me' : 'runner'} label={side === 'runner' ? 'você' : 'escondida'} />
            <Who at={at(258, 400)} l={side === 'runner' ? 'L' : 'C'} kind="hunter" label={side === 'runner' ? '40 m' : 'você'} />
            <Spot at={at(170, 372)}>
              {side === 'runner' ? <Sticker kind="heart" color={PINK} size={tick % 2 ? 56 : 50} tilt={-10} /> : <Sticker kind="mega" color="#FFC23D" size={tick % 2 ? 56 : 50} tilt={8} />}
            </Spot>
          </>
        )}
      </Layer>
    ),
  },
  {
    face: {
      kicker: 'O CERCO',
      tone: '#8A4FE0',
      title: 'A zona aperta a cada 5 min.',
      body: 'Ficou fora por 30 segundos? Os caçadores passam a te ver ao vivo até você voltar.',
      sticker: ['shrink', '#B57CFF'],
      hud: [['A ZONA ENCOLHE', 'agora', LIME], ['ZONA NOVA', '420 m']],
    },
    art: () => (
      <Layer
        svg={
          <>
            <Circle cx={195} cy={430} r={150} fill="none" stroke="rgba(243,240,232,0.35)" strokeWidth={3} strokeDasharray="6 10" />
            {zoneCircle(105, 440)}
          </>
        }>
        {(at) => (
          <>
            <Who at={at(318, 360)} l="P" label="fora · 0:30" />
            <Who at={at(190, 450)} l="C" kind="me" label="você" />
            <Who at={at(150, 400)} l="L" kind="hunter" />
          </>
        )}
      </Layer>
    ),
  },
  {
    face: {
      kicker: 'PEGA-PEGA',
      tone: PINK,
      title: 'Encostou, pegou.',
      body: 'O caçador encosta e você confirma no app. Preso, você espera: um amigo pode chegar perto e te soltar.',
      sticker: ['hand', PINK],
      hud: [['CORREDORES', '3 de 4', LIME], ['RODADA', '18:40']],
    },
    art: (_, tick) => (
      <Layer
        svg={
          <>
            {zoneCircle(105, 440)}
            <Circle cx={150} cy={470} r={40} fill="rgba(200,242,60,0.12)" stroke={LIME} strokeWidth={3} />
            <Circle cx={150} cy={470} r={40} fill="none" stroke={PAPER} strokeWidth={5} strokeLinecap="round" strokeDasharray={`${40 + (tick % 5) * 40} 400`} transform="rotate(-90 150 470)" />
          </>
        }>
        {(at) => (
          <>
            <Who at={at(150, 470)} l="T" kind="ghost" label="preso" />
            <Who at={at(228, 520)} l="C" kind="me" label="você · salvando" />
            <Who at={at(250, 380)} l="L" kind="hunter" />
            <Who at={at(272, 400)} l="P" label="pego" />
            <Spot at={at(258, 340)}>
              <Sticker kind="hand" color={PINK} size={48} tilt={18} />
            </Spot>
          </>
        )}
      </Layer>
    ),
  },
  {
    dim: 0.5,
    face: { kicker: 'SUA VEZ', tone: '#5E8C00', title: 'Bora jogar?', body: 'Junte 3 ou mais amigos. Um cria a partida e os outros entram pelo QR.', sticker: ['run', LIME] },
    art: () => (
      <Layer svg={zoneCircle(150, 380)} cy={380}>
        {(at) => (
          <Spot at={at(195, 360)}>
            <Sticker kind="hand" color={PINK} size={90} tilt={-12} />
          </Spot>
        )}
      </Layer>
    ),
  },
];

export default function ComoJogar() {
  const { passo = '1' } = useLocalSearchParams<{ passo?: string; de?: string }>();
  const insets = useScreenInsets();
  const create = useCreateGame();
  const { width, height } = useWindowDimensions();
  const [i, setI] = useState(() => Math.min(Math.max(Number(passo) - 1 || 0, 0), steps.length - 1));
  const [side, setSide] = useState<Side>(steps[i].side ?? 'runner');
  const [tick, setTick] = useState(0);
  const s = steps[i];
  const last = i === steps.length - 1;
  const face = side === 'hunter' && s.hunterFace ? s.hunterFace : s.face;

  // Relógio das animações (a luz da roda, o ping pulsando, o coração batendo).
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 420);
    return () => clearInterval(t);
  }, []);
  const go = (n: number) => {
    const k = Math.min(Math.max(n, 0), steps.length - 1);
    setI(k);
    setSide(steps[k].side ?? 'runner');
  };
  const leave = () => router.replace('/');
  const [free, setFree] = useState({ top: 200, bottom: 600 });

  return (
    <View style={{ flex: 1, backgroundColor: colors.inkSunken }}>
      <MapBackdrop fades={false} dim={s.dim ?? 0.15} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Free.Provider value={free}>{s.art(side, tick)}</Free.Provider>
      </View>

      {/* toque na tela: no terço esquerdo volta, no resto avança */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={last ? 'Último passo' : 'Próximo passo'}
        onPress={(e) => (e.nativeEvent.pageX < width / 3 ? go(i - 1) : last ? null : go(i + 1))}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[styles.top, { paddingTop: Math.max(insets.top, 20) + 8 }]}
        pointerEvents="box-none"
        onLayout={(e) => {
          const { y, height } = e.nativeEvent.layout;
          setFree((f) => ({ ...f, top: y + height }));
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} pointerEvents="box-none">
          <View accessibilityRole="progressbar" accessibilityLabel={`Passo ${i + 1} de ${steps.length}`} style={{ flex: 1, flexDirection: 'row', gap: 4 }} pointerEvents="none">
            {steps.map((_, k) => (
              <View key={k} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: k < i ? PAPER : k === i ? LIME : 'rgba(243,240,232,0.25)' }} />
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={leave} hitSlop={12}>
            <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong }}>{last ? 'OK' : 'Pular'}</Text>
          </Pressable>
        </View>
        {face.hud && height >= 640 ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }} pointerEvents="none">
            {face.hud.map(([label, value, tone]) => (
              <View key={label} style={styles.hud}>
                <Text style={styles.hudLabel}>{label}</Text>
                <Text style={[styles.hudValue, { color: tone ?? PAPER }]}>{value}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {s.hunterFace ? (
          <View style={styles.toggle}>
            {(['runner', 'hunter'] as const).map((k) => (
              <Pressable
                key={k}
                accessibilityRole="button"
                accessibilityState={{ selected: side === k }}
                onPress={() => setSide(k)}
                style={[styles.toggleBtn, side === k && { backgroundColor: k === 'runner' ? LIME : PINK }]}>
                <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: side === k ? (k === 'runner' ? INK : PAPER) : BENTO.muted }}>
                  {k === 'runner' ? 'Corredor' : 'Caçador'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <View
        style={[styles.cardBox, { bottom: Math.max(insets.bottom, 16) + 12 }]}
        pointerEvents={last ? 'box-none' : 'none'}
        onLayout={(e) => {
          const y = e.nativeEvent.layout.y;
          setFree((f) => ({ ...f, bottom: y - 34 }));
        }}>
        <Appear key={`${i}-${side}`} style={styles.card}>
        <View style={styles.cardSticker} pointerEvents="none">
          <Sticker kind={face.sticker[0]} color={face.sticker[1]} size={56} tilt={-8} />
        </View>
        <Text style={[styles.kicker, { color: face.tone }]}>{face.kicker}</Text>
        <Text style={styles.title}>{face.title}</Text>
        <Text style={styles.body}>{face.body}</Text>
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
          <Text style={styles.more}>toque para continuar ›</Text>
        )}
        </Appear>
      </View>
    </View>
  );
}

// Camada do desenho: coordenadas do design (390 de largura, zona em volta de
// cy) encaixadas no espaço livre entre o topo e o cartão, para nada ficar
// por baixo deles em telas baixas. As peças vão por cima do Svg.
function Layer({ svg, children, cy = 430 }: { svg: ReactNode; children: (at: (x: number, y: number) => At) => ReactNode; cy?: number }) {
  const { width: W } = useWindowDimensions();
  const free = useContext(Free);
  const room = Math.max(160, free.bottom - free.top);
  const k = Math.min(1.1, W / 370, room / 350);
  const ox = W / 2 - 195 * k;
  const oy = free.top + room / 2 - cy * k;
  const at = (x: number, y: number): At => ({ left: ox + x * k, top: oy + y * k });
  return (
    <>
      <Svg width={390 * k} height={844 * k} viewBox="0 0 390 844" style={{ position: 'absolute', left: ox, top: oy }}>
        {svg}
      </Svg>
      {children(at)}
    </>
  );
}

// Uma peça centrada no ponto.
function Spot({ at, children }: { at: At; children: ReactNode }) {
  return (
    <View style={{ position: 'absolute', left: at.left - 60, top: at.top - 60, width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}

// Uma pessoa no mapa: corredor (verde), caçador (anel rosa), você (anel branco) ou rastro (tracejado).
function Who({ at, l, kind = 'runner', label }: { at: At; l: string; kind?: 'runner' | 'hunter' | 'me' | 'ghost'; label?: string }) {
  const size = kind === 'me' ? 36 : 30;
  const look =
    kind === 'hunter'
      ? { backgroundColor: INK, borderColor: PINK }
      : kind === 'me'
        ? { backgroundColor: LIME, borderColor: PAPER, boxShadow: '0 0 0 6px rgba(200,242,60,0.25)' }
        : kind === 'ghost'
          ? { backgroundColor: 'rgba(200,242,60,0.18)', borderColor: LIME, borderStyle: 'dashed' as const }
          : { backgroundColor: LIME, borderColor: INK };
  return (
    <View style={{ position: 'absolute', left: at.left - 70, top: at.top - size / 2, width: 140, alignItems: 'center' }}>
      <View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center' }, look]}>
        <Text style={{ fontFamily: fonts.display, fontSize: kind === 'me' ? 15 : 13, color: kind === 'hunter' ? PAPER : kind === 'ghost' ? LIME : INK }}>{l}</Text>
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

// A roda: seis celulares em volta e a luz passando por eles.
function Roda({ lit }: { lit: number }) {
  return (
    <Layer svg={null} cy={330}>
      {(at) => (
        <>
          {Array.from({ length: 6 }, (_, k) => {
            const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
            const p = at(195 + Math.cos(a) * 112, 330 + Math.sin(a) * 112);
            const on = k === lit;
            return (
              <View
                key={k}
                style={[
                  styles.phone,
                  { left: p.left - 22, top: p.top - 36, transform: [{ rotate: `${(a * 180) / Math.PI + 90}deg` }] },
                  on ? { backgroundColor: PINK, borderColor: PAPER, boxShadow: '0 0 30px 10px rgba(255,42,85,0.55)' } : null,
                ]}>
                <Text style={{ fontFamily: fonts.display, fontSize: 15, color: on ? PAPER : '#55606B' }}>{'CLJPTS'[k]}</Text>
              </View>
            );
          })}
          <Spot at={at(195, 330)}>
            <Sticker kind="hand" color={PINK} size={80} tilt={-10} />
          </Spot>
        </>
      )}
    </Layer>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 16, right: 16, top: 0 },
  hud: { flex: 1, backgroundColor: INK, borderWidth: 2, borderColor: BENTO.line, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12 },
  hudLabel: { fontSize: 10, fontFamily: fonts.bodyStrong, letterSpacing: 0.4, color: BENTO.muted },
  hudValue: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
  toggle: { flexDirection: 'row', alignSelf: 'center', marginTop: 14, backgroundColor: INK, borderWidth: 2, borderColor: BENTO.line, borderRadius: 999, padding: 4 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999 },
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
  chip: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: INK, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  tag: { marginTop: 4, backgroundColor: INK, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 },
  phone: { position: 'absolute', width: 44, height: 72, borderRadius: 12, backgroundColor: '#1A2027', borderWidth: 3, borderColor: '#2A333D', alignItems: 'center', justifyContent: 'center' },
});
