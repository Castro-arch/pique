import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { MapBackdrop, MapPin } from '@/components/MapBackdrop';
import { Logo } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { photos } from '@/lib/demo';
import { colors } from '@/theme/tokens';

// 1.1 Boas-vindas
export default function BemVindo() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <View style={styles.top}>
        <MapBackdrop zone={{ cx: 195, cy: 250, r: 130 }} fades={false}>
          <MapPin x={112} y={170}><Avatar source={photos.priya} size={44} state="runner" /></MapPin>
          <MapPin x={236} y={206}><Avatar source={photos.teo} size={44} state="runner" /></MapPin>
          <MapPin x={150} y={286}><Avatar source={photos.leo} size={44} state="hunter" /></MapPin>
          <MapPin x={262} y={128}><Avatar source={photos.sasha} size={36} state="runner" /></MapPin>
        </MapBackdrop>
        <LinearGradient
          colors={['rgba(16,20,24,0.55)', 'rgba(16,20,24,0.1)', 'rgba(16,20,24,0.85)', colors.ink]}
          locations={[0, 0.4, 0.8, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <Screen background="transparent">
        <Logo />
        <Spacer />
        <Headline variant="display" style={{ fontSize: 58, lineHeight: 54 }}>
          Pique-esconde pela cidade
        </Headline>
        <Text variant="muted" style={{ marginTop: 14, fontSize: 16 }}>
          Uns se escondem, outros caçam. O celular cuida do tempo, dos pings e de quem ganhou.
        </Text>
        <Button label="Começar" style={{ marginTop: 24 }} onPress={() => router.push('/email')} />
        <Button label="Já tenho conta" variant="ghost" size="md" onPress={() => router.push('/email')} />
        <Text variant="small" style={{ textAlign: 'center', fontSize: 11, marginTop: 6 }}>
          Ao continuar, você aceita os Termos e a Política de privacidade.
        </Text>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, height: '62%' },
});
