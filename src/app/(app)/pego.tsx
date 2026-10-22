import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { photos } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

// 8.1 "Um caçador te achou?" O corredor confirma a pega (MVP do documento).
export default function Pego() {
  const yes = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    router.replace('/achado');
  };
  return (
    <View style={styles.root}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <View accessibilityRole="alert" accessibilityViewIsModal style={styles.dialog}>
        <Avatar source={photos.leo} size={64} state="hunter" label="Leo, caçador" />
        <Text style={styles.title}>Um caçador te achou?</Text>
        <Text variant="muted" style={{ textAlign: 'center', marginTop: 8 }}>
          Você sai da rodada e sua localização para de ser compartilhada. A crew te espera no fim.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20, alignSelf: 'stretch' }}>
          <Button variant="secondary" label="Ainda não" style={{ flex: 1, backgroundColor: colors.ink }} onPress={() => router.back()} />
          <Button variant="danger" label="Sim, me acharam" style={{ flex: 1.3 }} onPress={yes} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  dialog: {
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.xxl,
    padding: 22,
    alignItems: 'center',
  },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 32, letterSpacing: -1, textAlign: 'center', marginTop: 16, color: colors.paper },
});
