import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowRight } from '@/components/icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { photos } from '@/lib/demo';
import { colors, fonts } from '@/theme/tokens';

// 5.6 O anfitrião caiu e você assumiu o lobby.
export default function AnfitriaoSaiu() {
  return (
    <View style={{ flex: 1 }}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <Sheet top={300}>
        <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22 }}>
          <View style={styles.gone}>
            <Image source={photos.leo} style={{ width: 50, height: 50, borderRadius: 25, opacity: 0.5 }} />
          </View>
          <ArrowRight size={22} color={colors.paperMuted} />
          <Avatar source={photos.castro} size={56} state="runner" />
        </View>
        <Text style={styles.title}>
          O Leo caiu. Agora você é o anfitrião<Text style={[styles.title, { color: colors.lime }]}>.</Text>
        </Text>
        <Text variant="muted" style={{ marginTop: 8 }}>
          Você estava há mais tempo no lobby. As regras e a zona continuam as mesmas. Se o Leo voltar, ele entra como jogador.
        </Text>
        <View style={{ flex: 1 }} />
        <Button label="Beleza, sigo como anfitrião" onPress={() => router.back()} />
        <Button variant="link" label="Passar para outra pessoa" style={{ marginTop: 6 }} onPress={() => router.replace('/lobby/jogadores')} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  gone: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderStyle: 'dashed', borderColor: colors.inkMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 32, letterSpacing: -1, marginTop: 16, color: colors.paper },
});
