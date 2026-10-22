import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/Controls';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

const week = [0.3, 0.52, 0.18, 0.44, 0.6, 0.36, 0.7, 1];

// 3.2 Estatísticas e 3.3 Estatísticas vazias (?vazio=1, antes da 1ª rodada)
export default function Estatisticas() {
  const { vazio } = useLocalSearchParams<{ vazio?: string }>();
  const empty = vazio === '1';

  return (
    <Screen scroll>
      <View style={styles.head}>
        <Text variant="h2" accessibilityRole="header">Suas estatísticas</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 15 }}>Concluir</Text>
        </Pressable>
      </View>

      {empty ? <Empty /> : <Full />}
    </Screen>
  );
}

function Full() {
  return (
    <>
      <View style={[styles.hero]}>
        <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 0.5, color: colors.limeInk }}>ESTA SEMANA</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 64, lineHeight: 66, color: colors.limeInk, letterSpacing: -2.5 }}>52</Text>
          <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 16, color: colors.limeInk }}>min escondido</Text>
        </View>
        <View style={styles.heroRow}>
          {[
            ['Rodadas', '3'],
            ['Distância', '4,2 km'],
            ['Pings', '31'],
          ].map(([l, v]) => (
            <View key={l} style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.limeInk }}>{l}</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.limeInk }}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.grid}>
        <Stat label="Rodadas jogadas" value="31" note="3 esta semana" />
        <Stat label="Rodadas vencidas" value="12" note="39% das rodadas" />
        <Stat label="Seu recorde" value="30:00" note="escondido, rodada inteira" highlight />
        <Stat label="Caçador mais perto" value="38 m" note="e ele não te viu" />
      </View>

      <View style={styles.box}>
        <View style={styles.boxHead}>
          <Text variant="h3" style={{ fontSize: 16 }}>Distância por semana</Text>
          <Text variant="label" style={{ fontSize: 11 }}>contra você mesmo</Text>
        </View>
        <View style={styles.bars} accessible accessibilityLabel="Distância semanal nas últimas 8 semanas, subindo até 4,2 km nesta semana">
          {week.map((h, i) => (
            <View key={i} style={{ flex: 1, height: `${h * 100}%`, borderRadius: 5, backgroundColor: i === week.length - 1 ? colors.lime : colors.inkBorder }} />
          ))}
        </View>
      </View>

      <View style={styles.box}>
        <View style={styles.boxHead}>
          <Text variant="h3" style={{ fontSize: 16 }}>Meta da crew</Text>
          <Text variant="label">
            5 de 8 · <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 12 }}>faltam 3</Text>
          </Text>
        </View>
        <View style={{ marginTop: 10 }}>
          <ProgressBar value={5 / 8} height={8} />
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/historico')} style={styles.link}>
        <Text style={{ flex: 1, fontSize: 15 }}>Ver todas as partidas</Text>
        <ChevronRight size={18} color={colors.inkMuted} />
      </Pressable>
    </>
  );
}

function Empty() {
  return (
    <>
      <View style={styles.grid} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {['Rodadas jogadas', 'Rodadas vencidas', 'Seu recorde', 'Caçador mais perto'].map((l, i) => (
          <View key={l} style={[styles.ghost]}>
            <Text style={{ fontSize: 12, color: colors.inkMuted }}>{l}</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 34, color: colors.inkBorder }}>{['–', '–', '–:–', '– m'][i]}</Text>
          </View>
        ))}
      </View>
      <Headline variant="h2" style={{ textAlign: 'center', marginTop: 28 }}>Seus números aparecem depois da 1ª rodada</Headline>
      <Text variant="muted" style={{ textAlign: 'center', marginTop: 10 }}>
        Tempo escondido, distância, pegas e o caçador que passou mais perto. Tudo contra você mesmo.
      </Text>
      <Spacer />
      <View style={{ gap: 8, marginTop: 24 }}>
        <Button label="Entrar numa partida" onPress={() => router.replace('/entrar')} />
        <Button label="Treinar com bots · 5 min" variant="secondary" onPress={() => router.replace('/treino')} />
      </View>
    </>
  );
}

function Stat({ label, value, note, highlight }: { label: string; value: string; note: string; highlight?: boolean }) {
  return (
    <View style={[styles.stat, highlight && { backgroundColor: colors.limeTint, borderColor: colors.lime }]}>
      <Text style={{ fontSize: 12, color: highlight ? colors.lime : colors.paperMuted, fontFamily: highlight ? fonts.bodyStrong : fonts.body }}>{label}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 36, lineHeight: 42, color: highlight ? colors.lime : colors.paper }}>{value}</Text>
      <Text style={{ fontSize: 12, color: highlight ? colors.lime : colors.paperMuted }}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  hero: { backgroundColor: colors.lime, borderRadius: radius.xxl, padding: 18, marginTop: 12 },
  heroRow: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(22,32,10,0.25)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  stat: { width: '48.4%', backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: 22, padding: 14 },
  ghost: { width: '48.4%', backgroundColor: colors.inkSunken, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.inkBorder, borderRadius: 22, padding: 14 },
  box: { backgroundColor: colors.inkSunken, borderWidth: 1, borderColor: colors.inkLine, borderRadius: 22, padding: 14, marginTop: 12 },
  boxHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, height: 62, marginTop: 8 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    marginTop: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.lg,
  },
});
