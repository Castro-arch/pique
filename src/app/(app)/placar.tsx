import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { CloseButton } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { match, photos } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

type Line = { photo: number; name: string; you?: boolean; note: string; value: string; state: 'runner' | 'hunter' | 'out' };

const runners: Line[] = [
  { photo: photos.castro, name: 'Castro', you: true, note: 'Escapou · Leo passou a 38 m', value: '30:00', state: 'runner' },
  { photo: photos.priya, name: 'Priya', note: 'Escapou · 14 pings', value: '30:00', state: 'runner' },
  { photo: photos.sasha, name: 'Sasha', note: 'Pega pelo Leo', value: '22:10', state: 'out' },
  { photo: photos.teo, name: 'Teo', note: 'Pego pelo Jonah', value: '8:47', state: 'out' },
];
const hunters: Line[] = [
  { photo: photos.leo, name: 'Leo', note: '1 pega · 3,4 km', value: '1', state: 'hunter' },
  { photo: photos.jonah, name: 'Jonah', note: '1 pega · mais rápida da rodada', value: '1', state: 'hunter' },
];

// 8.7 Placar geral da rodada
export default function Placar() {
  return (
    <Screen scroll>
      <View style={styles.head}>
        <Text variant="small">{`${match.code} · Rodada ${match.round} · 30:00`}</Text>
        <CloseButton onPress={() => router.replace('/')} />
      </View>
      <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.lime, marginTop: 8 }}>Corredores venceram</Text>
      <Headline style={{ marginTop: 4 }}>2 escaparam até o fim</Headline>

      <Group title="Corredores" lines={runners} />
      <Group title="Caçadores" lines={hunters} />

      <Spacer />
      <Button label="Revanche com a mesma crew" style={{ marginTop: 22 }} onPress={() => router.replace('/sorteio')} />
    </Screen>
  );
}

function Group({ title, lines }: { title: string; lines: Line[] }) {
  return (
    <>
      <Text variant="label" style={{ marginTop: 18, marginBottom: 6, marginLeft: 6 }}>{title}</Text>
      <View style={styles.list}>
        {lines.map((l, i) => (
          <View key={l.name} style={[styles.row, i < lines.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.inkBorder }]}>
            <Avatar source={l.photo} size={38} state={l.state} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: fonts.bodyStrong }}>
                {l.name}
                {l.you ? <Text style={{ fontSize: 12, color: colors.lime }}> você</Text> : null}
              </Text>
              <Text variant="label">{l.note}</Text>
            </View>
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 18,
                color: l.state === 'runner' ? colors.lime : l.state === 'hunter' ? colors.pink : colors.paperMuted,
              }}>
              {l.value}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  list: { backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: radius.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 14 },
});
