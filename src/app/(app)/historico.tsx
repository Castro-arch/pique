import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { BackButton } from '@/components/Nav';
import { Screen } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

type Match = {
  title: string;
  sub: string;
  big: string;
  small: string;
  tone: 'runner' | 'hunter' | 'out';
  path: string;
};

const groups: { title: string; items: Match[] }[] = [
  {
    title: 'Esta semana',
    items: [
      { title: 'Escapou · corredor', sub: 'Hoje · TACO42 · com Leo e +4', big: '30:00', small: '1,9 km', tone: 'runner', path: 'M12 44 C18 34 14 26 24 22 C32 18 30 10 42 10' },
      { title: 'Venceu · caçador', sub: 'Ontem · BOLA77 · 3 pegas', big: '3', small: '3,4 km', tone: 'hunter', path: 'M10 20 C20 22 24 36 34 34 C42 32 40 44 48 46' },
      { title: 'Pego pelo Leo · corredor', sub: 'Seg · TACO42', big: '4:27', small: '640 m', tone: 'out', path: 'M14 40 C22 34 22 24 30 22' },
    ],
  },
  {
    title: 'Outubro',
    items: [
      { title: 'Escapou · corredor', sub: '12 out · treino com bots', big: '5:00', small: 'treino', tone: 'runner', path: 'M10 30 C20 20 30 40 46 26' },
      { title: 'Perdeu · caçador', sub: '10 out · ZEBRA9 · 1 pega', big: '1', small: '2,2 km', tone: 'hunter', path: 'M12 14 C24 18 20 34 32 38 C40 40 42 30 48 28' },
    ],
  },
];

const toneColor = { runner: colors.lime, hunter: colors.pink, out: colors.paperMuted } as const;

// 3.4 Histórico de partidas (trilha só no celular, como manda o documento)
export default function Historico() {
  return (
    <Screen scroll>
      <BackButton label="Estatísticas" />
      <Headline style={{ marginTop: 10, fontSize: 36, lineHeight: 36 }}>Suas partidas</Headline>
      {groups.map((g) => (
        <View key={g.title}>
          <Text variant="label" style={{ margin: 6, marginTop: 16 }}>{g.title}</Text>
          <View style={{ gap: 8 }}>
            {g.items.map((m) => (
              <View key={m.sub} style={styles.item} accessible accessibilityLabel={`${m.title}, ${m.sub}, ${m.big}, ${m.small}`}>
                <View style={styles.thumb}>
                  <Svg width={56} height={56} viewBox="0 0 56 56">
                    <Rect width={56} height={56} fill="#18271D" />
                    <Path d="M0 40 C18 30 36 48 56 34" stroke="#2C3A2C" strokeWidth={4} fill="none" />
                    <Path d={m.path} stroke={toneColor[m.tone]} strokeWidth={3} fill="none" strokeLinecap="round" />
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 15 }}>{m.title}</Text>
                  <Text variant="label" style={{ marginTop: 2 }}>{m.sub}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="number" style={{ fontSize: 18, color: m.tone === 'out' ? colors.paper : toneColor[m.tone] }}>{m.big}</Text>
                  <Text variant="label">{m.small}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.lg,
    padding: 12,
  },
  thumb: { width: 56, height: 56, borderRadius: 14, overflow: 'hidden' },
});
