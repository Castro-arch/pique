import { useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Vibrate } from '@/components/icons';
import { Text } from '@/components/Text';
import { errorInfo, revealedEarly, useFollowRound, useLobby, type GameId } from '@/lib/game';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

// Linha 15: sorteio na roda. Todo mundo junta os celulares no meio, o anfitrião
// gira e a luz passa de um para o outro até parar em quem caça. O plano da luz
// vem do servidor (horário de cada passada); cada celular só acende na sua vez.
// Quando a última parada acaba, a rodada começa e todos vão para a revelação.

type Draw = { startAt: number; endAt: number; order: string[]; steps: { at: number; id: string }[]; stops: number[] };

export default function Roda() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lobby = useLobby(id);
  const spin = useMutation(api.rounds.spin);
  const insets = useScreenInsets();
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  useFollowRound(id, lobby?.status);
  const offset = useServerOffset();
  const now = useFastNow(!!lobby?.draw) + offset;

  const draw = lobby?.draw as Draw | null | undefined;
  const meId = lobby?.me.id;
  const players = lobby?.players ?? [];
  const order = draw?.order ?? [...players].map((p) => p.id);
  const nameOf = (pid: string) => {
    const p = players.find((x) => x.id === pid);
    return p ? (p.isMe ? 'Você' : p.name) : '?';
  };

  // Onde a luz está agora e quem já foi escolhido.
  let lit: string | null = null;
  let stopped = false;
  let k = -1;
  const chosen: string[] = [];
  if (draw && now >= draw.startAt) {
    k = 0;
    while (k + 1 < draw.steps.length && draw.steps[k + 1].at <= now) k++;
    lit = draw.steps[k].id;
    stopped = draw.stops.includes(k);
    for (const s of draw.stops) if (s <= k) chosen.push(draw.steps[s].id);
  }
  const mine = !!meId && lit === meId;
  useBuzz(mine ? String(k) : null, stopped && mine);

  // A luz parou em mim: direto para "Você pega". Parou de vez em outra
  // pessoa (último caçador): quem sobrou vai direto para "Corra".
  const finalStop = !!draw && k === draw.steps.length - 1;
  const papel = stopped && mine ? 'hunter' : finalStop && meId && !chosen.includes(meId) ? 'runner' : null;
  useEffect(() => {
    if (!papel) return;
    revealedEarly(id);
    router.replace({ pathname: '/papel', params: { id, papel } });
  }, [papel, id]);

  const go = async () => {
    setError(null);
    setSpinning(true);
    try {
      await spin({ gameId: id as GameId });
    } catch (e) {
      setError(errorInfo(e).message);
    } finally {
      setSpinning(false);
    }
  };

  // 15.2 A luz está em mim: a tela inteira acende.
  if (mine && !stopped) {
    return (
      <View style={[styles.full, { backgroundColor: colors.lime }]}>
        <View style={styles.eye}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lime }} />
        </View>
        <Text style={[styles.big, { color: colors.limeInk, marginTop: 26 }]}>Aqui!</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <Vibrate size={18} color={colors.limeInk} />
          <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong, color: colors.limeInk }}>a luz está no seu celular</Text>
        </View>
      </View>
    );
  }

  const ready = players.filter((p) => p.ready || p.isHost).length;
  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 44) + 12, paddingBottom: Math.max(insets.bottom, 20) + 14 }, draw && { backgroundColor: '#07090B' }]}>
      <View style={styles.head}>
        <Chip label="Sorteio na roda" />
        {draw ? <Chip label="girando…" tone="runner" /> : lobby?.code ? <Chip label={lobby.code} /> : null}
      </View>
      <View style={{ alignItems: 'center', marginTop: 14 }}>
        <Wheel order={order} lit={lit} chosen={chosen} meId={meId} nameOf={nameOf} />
      </View>
      {draw ? (
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.title, { textAlign: 'center' }]}>
            Olha a luz<Text style={[styles.title, { color: colors.lime }]}>…</Text>
          </Text>
          <Text variant="muted" style={{ marginTop: 8, textAlign: 'center', maxWidth: 290 }}>
            {stopped ? 'Tem mais caçador: ela vai girar de novo.' : 'Cada vez mais devagar. Seu celular acende quando ela passar por ele.'}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.title}>
            Juntem os celulares<Text style={[styles.title, { color: colors.lime }]}>.</Text>
          </Text>
          <Text variant="muted" style={{ marginTop: 10 }}>
            Coloquem todos no meio da roda, com a tela para cima. A luz vai passar de um para o outro. Onde ela parar é caçador.
          </Text>
          <View style={styles.count}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.lime }} />
            <Text style={{ flex: 1, fontSize: 14, fontFamily: fonts.bodyStrong }}>{`${ready} de ${players.length} na roda`}</Text>
            <Text variant="small">{`${lobby?.rules.hunters ?? 1} ${(lobby?.rules.hunters ?? 1) === 1 ? 'caçador' : 'caçadores'}`}</Text>
          </View>
        </>
      )}
      <View style={{ flex: 1 }} />
      {error ? <Text variant="error" style={{ marginBottom: 10 }}>{error}</Text> : null}
      {draw ? (
        <Text variant="label" style={{ textAlign: 'center' }}>Seu celular apaga quando a luz não está nele</Text>
      ) : lobby?.isHost ? (
        <>
          <Button label="Girar a roleta" loading={spinning} onPress={go} />
          <Button variant="link" label="Voltar ao lobby" style={{ marginTop: 4 }} onPress={() => router.replace({ pathname: '/lobby', params: { id } })} />
        </>
      ) : (
        <Text variant="label" style={{ textAlign: 'center' }}>Esperando o anfitrião girar a roleta…</Text>
      )}
    </View>
  );
}

// A roda vista de cima: um celular por pessoa, aceso quando a luz está nele.
function Wheel({ order, lit, chosen, meId, nameOf }: { order: string[]; lit: string | null; chosen: string[]; meId?: string; nameOf: (id: string) => string }) {
  const size = 280;
  const c = size / 2;
  const r = size * 0.3;
  const n = Math.max(order.length, 1);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} fill="none" stroke={colors.inkBorder} strokeWidth={2} strokeDasharray="4 6" />
      {order.map((pid, i) => {
        const a = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x = c + r * Math.cos(a);
        const y = c + r * Math.sin(a);
        const w = n > 8 ? 20 : 28;
        const h = w * 1.9;
        const on = pid === lit;
        const hunter = chosen.includes(pid);
        const fill = hunter ? colors.pink : on ? colors.lime : colors.inkRaised;
        const lx = c + (r + 44) * Math.cos(a);
        const ly = c + (r + 44) * Math.sin(a);
        return (
          <G key={pid}>
            <G transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + 90})`}>
              {on || hunter ? <Rect x={-w / 2 - 5} y={-h / 2 - 5} width={w + 10} height={h + 10} rx={w * 0.4} fill={hunter ? colors.pink : colors.lime} opacity={0.25} /> : null}
              <Rect x={-w / 2} y={-h / 2} width={w} height={h} rx={w * 0.22} fill={fill} stroke={on ? '#E6FF8A' : colors.inkBorder} strokeWidth={2} />
            </G>
            <SvgText x={lx} y={ly + 4} textAnchor="middle" fontSize={12} fontWeight="600" fill={hunter ? colors.pink : pid === meId ? colors.lime : colors.paperMuted}>
              {nameOf(pid)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// Quanto o relógio do servidor está à frente do celular (ms). Mede 3 vezes
// e fica com a ida-e-volta mais rápida, que é a mais precisa.
function useServerOffset() {
  const clock = useMutation(api.games.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let best = { rtt: Infinity, off: 0 };
      for (let i = 0; i < 3; i++) {
        const t0 = Date.now();
        try {
          const server = await clock({});
          const t1 = Date.now();
          if (t1 - t0 < best.rtt) best = { rtt: t1 - t0, off: server - (t0 + t1) / 2 };
        } catch {
          return;
        }
      }
      if (!cancelled && Number.isFinite(best.rtt)) setOffset(best.off);
    })();
    return () => {
      cancelled = true;
    };
  }, [clock]);
  return offset;
}

// Relógio rápido enquanto a roleta gira (a luz pula a cada 80 ms no começo).
function useFastNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 40);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

// Uma vibradinha a cada passada da luz no meu celular; forte quando para em mim.
function useBuzz(key: string | null, stop: boolean) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!key || key === last.current) return;
    last.current = key;
    if (Platform.OS === 'web') {
      (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate?.(stop ? [200, 80, 200] : 30);
    } else if (stop) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }, [key, stop]);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: 20 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 38, lineHeight: 40, letterSpacing: -1.4, marginTop: 6 },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  full: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  eye: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.limeInk, alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: fonts.display, fontSize: 64, lineHeight: 66, letterSpacing: -2.5 },
});
