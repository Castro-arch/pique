import { useAuthActions } from '@convex-dev/auth/react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { MapBackdrop, MapPin } from '@/components/MapBackdrop';
import { Logo } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { BETA_SEM_LOGIN } from '@/lib/beta';
import { photos } from '@/lib/demo';
import { colors } from '@/theme/tokens';

// 1.1 Boas-vindas
export default function BemVindo() {
  const { signIn } = useAuthActions();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No beta não tem login: cria uma conta anônima e o guarda de rotas
  // leva direto para "Seu nome" (conta sem nome ainda).
  async function start() {
    if (!BETA_SEM_LOGIN) return router.push('/como-entrar');
    setError(null);
    setStarting(true);
    try {
      await signIn('anonymous');
    } catch {
      setError('Não deu para começar. Confira a internet e tente de novo.');
      setStarting(false);
    }
  }

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
        <Button label="Começar" style={{ marginTop: 24 }} loading={starting} onPress={start} />
        {error ? <Text variant="error" style={{ textAlign: 'center', marginTop: 8 }}>{error}</Text> : null}
        {BETA_SEM_LOGIN ? null : (
          <Button label="Já tenho conta" variant="ghost" size="md" onPress={() => router.push('/como-entrar')} />
        )}
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
