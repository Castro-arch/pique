import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AvatarStack } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { BackButton } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { photos } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

// 4.5 Partida em andamento ou cheia: não dá pra entrar no meio.
export default function Indisponivel() {
  return (
    <Screen>
      <BackButton />
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text variant="label">Partida</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6 }}>TACO42</Text>
          </View>
          <Chip label="Em andamento · 12:40" tone="hunter" dot={colors.pink} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <AvatarStack sources={[photos.leo, photos.priya, photos.sasha]} size={30} />
          <Text variant="small">6 jogando com o Leo</Text>
        </View>
      </View>

      <Headline dot={colors.pink} style={{ marginTop: 24 }}>Essa rodada já começou</Headline>
      <Text variant="muted" style={{ marginTop: 12 }}>
        Não dá pra entrar no meio. Peça pro Leo te avisar: você entra direto na próxima, que começa em uns 18 min.
      </Text>

      <View style={styles.note}>
        <Bell size={18} color={colors.lime} strokeWidth={2.2} style={{ marginTop: 1 }} />
        <Text variant="small" style={{ flex: 1 }}>Partida cheia (20 de 20) aparece aqui do mesmo jeito, com o mesmo botão.</Text>
      </View>

      <Spacer />
      <Button label="Me avisa na próxima rodada" onPress={() => router.replace('/')} />
      <Button variant="secondary" label="Criar uma partida minha" style={{ marginTop: 8 }} onPress={() => router.replace('/lobby')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 24, backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: radius.xl, padding: 16 },
  note: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
