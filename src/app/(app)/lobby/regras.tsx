import { useMutation } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Stepper, Toggle } from '@/components/Controls';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { match } from '@/lib/demo';
import { useLobby, type GameId } from '@/lib/game';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../../convex/_generated/api';

type Rules = { durationMin: number; headStartMin: number; pingEveryMin: number; zoneMeters: number; shrinkEveryMin: number; hunters: number; shrink: boolean; spectatorsHelp: boolean };
const defaults: Rules = { ...match.rules, shrink: true, spectatorsHelp: false };
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// 5.3 Regras da casa (folha por cima do lobby)
export default function Regras() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const lobby = useLobby(id);
  const save = useMutation(api.games.setRules);
  const [r, setR] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  // Com partida real, começa pelas regras salvas no servidor.
  useEffect(() => {
    if (lobby && !loaded) {
      setR((x) => ({ ...x, ...lobby.rules }));
      setLoaded(true);
    }
  }, [lobby, loaded]);
  const set = (patch: Partial<typeof r>) => setR((x) => ({ ...x, ...patch }));
  const total = lobby?.players.length ?? 6;
  const submit = async () => {
    if (id) {
      const { zoneMeters: _z, ...rules } = r;
      await save({ gameId: id as GameId, rules });
    }
    router.back();
  };
  const runners = total - r.hunters;
  // Quantas vezes cada corredor aparece no mapa depois da vantagem.
  const pings = Math.floor((r.durationMin - r.headStartMin) / r.pingEveryMin);

  return (
    <View style={{ flex: 1 }}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <Sheet top={92}>
        <View style={styles.head}>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.8 }}>Regras da casa</Text>
          <Pressable accessibilityRole="button" onPress={() => setR(defaults)} style={{ height: 44, justifyContent: 'center' }}>
            <Text variant="muted" style={{ fontSize: 14, fontFamily: fonts.bodyMedium }}>Padrão</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 6 }}>
          <Row title="Duração da rodada" sub="Corredores vencem se alguém chegar ao fim">
            <Stepper label="duração" value={`${r.durationMin} min`} onMinus={() => set({ durationMin: clamp(r.durationMin - 5, 10, 60) })} onPlus={() => set({ durationMin: clamp(r.durationMin + 5, 10, 60) })} />
          </Row>
          <Row title="Vantagem" sub="Caçadores esperam parados">
            <Stepper label="vantagem" value={`${r.headStartMin} min`} onMinus={() => set({ headStartMin: clamp(r.headStartMin - 1, 1, 10) })} onPlus={() => set({ headStartMin: clamp(r.headStartMin + 1, 1, 10) })} />
          </Row>
          <Row title="Ping a cada" sub="Menos tempo = mais difícil se esconder">
            <Stepper label="ping" value={`${r.pingEveryMin} min`} onMinus={() => set({ pingEveryMin: clamp(r.pingEveryMin - 1, 1, 5) })} onPlus={() => set({ pingEveryMin: clamp(r.pingEveryMin + 1, 1, 5) })} />
          </Row>
          <Row title="Caçadores" sub={`Os outros ${runners} começam correndo`}>
            <Stepper label="caçadores" value={String(r.hunters)} onMinus={() => set({ hunters: clamp(r.hunters - 1, 1, 3) })} onPlus={() => set({ hunters: clamp(r.hunters + 1, 1, 3) })} />
          </Row>
          <Row title="Zona encolhe" sub={`A cada ${r.shrinkEveryMin} min, até 150 m`}>
            <Toggle label="Zona encolhe" value={r.shrink} onChange={(v) => set({ shrink: v })} />
          </Row>
          <Row title="Espectadores ajudam no Radio" sub="Quem foi pego pode avisar a crew" last>
            <Toggle label="Espectadores ajudam no Radio" value={r.spectatorsHelp} onChange={(v) => set({ spectatorsHelp: v })} />
          </Row>
        </View>

        <View style={styles.tip}>
          <Text variant="small" style={{ lineHeight: 19 }}>
            <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 13 }}>Na prática:</Text> {r.headStartMin} min para sumir, depois cada
            corredor aparece umas {pings} vezes até o fim.
          </Text>
        </View>

        <View style={{ flex: 1 }} />
        <Button label="Salvar regras" onPress={submit} />
      </Sheet>
    </View>
  );
}

function Row({ title, sub, children, last }: { title: string; sub: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.inkBorder }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 15 }}>{title}</Text>
        <Text variant="label" style={{ marginTop: 2 }}>{sub}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64 },
  tip: { marginTop: 14, backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14 },
});
