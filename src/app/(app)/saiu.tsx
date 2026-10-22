import { router } from 'expo-router';
import { Check, MessageCircle } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { useMe } from '@/lib/useMe';
import { colors, fonts, radius } from '@/theme/tokens';

// 7.5 Você saiu. Tudo certo.
export default function Saiu() {
  const me = useMe();
  return (
    <Screen>
      <Spacer />
      <View style={styles.icon}>
        <Check size={40} color={colors.lime} strokeWidth={3} />
      </View>
      <Headline style={{ marginTop: 22 }}>{'Você saiu.\nTudo certo'}</Headline>
      <Text variant="muted" style={{ marginTop: 12 }}>
        Sua localização parou de ser enviada e a crew foi avisada. A partida segue sem você.
      </Text>
      <View style={styles.msg}>
        <MessageCircle size={18} color={colors.paperMuted} />
        <Text variant="small" style={{ flex: 1 }}>
          Mensagem para a crew: <Text style={{ fontFamily: fonts.bodyStrong, color: colors.paper, fontSize: 13 }}>“{me.name} saiu da partida.”</Text>
        </Text>
      </View>
      <Spacer />
      <Button label="Voltar ao início" onPress={() => router.replace('/')} />
      <Button variant="link" label="Ver a partida como espectador" style={{ marginTop: 6 }} onPress={() => router.replace('/espectador')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 88, height: 88, borderRadius: radius.xxl, backgroundColor: colors.limeTint, alignItems: 'center', justifyContent: 'center' },
  msg: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
