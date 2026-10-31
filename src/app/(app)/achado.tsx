import { router, useLocalSearchParams } from 'expo-router';
import { EyeOff } from '@/components/icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Illustration } from '@/components/Illustration';
import { MapBackdrop } from '@/components/MapBackdrop';
import { Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { illustrations, photos } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

// 8.2 Você foi achado. Padrão: com a ilustração. ?estilo=mapa: versão com o mapa e os números.
export default function Achado() {
  const { estilo } = useLocalSearchParams<{ estilo?: string }>();
  const insets = useSafeAreaInsets();
  const pad = { paddingBottom: Math.max(insets.bottom, 34) };

  if (estilo === 'mapa') {
    return (
      <View style={[styles.root, pad, { paddingTop: Math.max(insets.top, 56) }]}>
        <MapBackdrop dim={0.6} grayscale fades={false} />
        <View style={styles.body}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ opacity: 0.8 }}>
              <Avatar source={photos.castro} size={64} state="out" />
            </View>
            <View>
              <Chip label="Fora" tone="dark" />
              <Text variant="small" style={{ marginTop: 6 }}>Encontrado · 28:33 · correu 640 m</Text>
            </View>
          </View>
          <Spacer />
          <Headline variant="display" dot={colors.pink} style={{ fontSize: 64, lineHeight: 60 }}>{'O Leo\nte achou'}</Headline>
          <Text variant="muted" style={{ marginTop: 12, fontSize: 16 }}>Você segurou 4:27 e passou por 1 ping. A crew já está te esperando.</Text>
          <Private />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Stat label="Escondido" value="4:27" />
            <Stat label="Pings" value="1" />
            <Stat label="Achado por" value="Leo" color={colors.pink} />
          </View>
          <Button label="Encontrar a crew" style={{ marginTop: 22 }} onPress={() => router.replace('/placar')} />
          <Button variant="link" label="Continuar assistindo" style={{ marginTop: 6 }} onPress={() => router.replace('/espectador')} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, pad]}>
      <View style={{ marginTop: Math.max(insets.top, 30) }}>
        <Illustration source={illustrations.achado} label="Ilustração: o caçador encontrando o corredor escondido" />
      </View>
      <View style={[styles.body, { marginTop: -10 }]}>
        <Chip label="Encontrado aos 28:33" tone="hunter" dot={colors.pink} style={{ alignSelf: 'flex-start', marginBottom: 14 }} />
        <Headline variant="display" dot={colors.pink} style={{ fontSize: 56, lineHeight: 52 }}>{'O Leo\nte achou'}</Headline>
        <Text variant="muted" style={{ marginTop: 12, fontSize: 16 }}>
          Você segurou 4:27 e passou por 1 ping. Agora dá pra assistir e ajudar a crew pelo Radio.
        </Text>
        <Spacer />
        <Private />
        <Button label="Assistir ao resto da rodada" style={{ marginTop: 14 }} onPress={() => router.replace('/espectador')} />
      </View>
    </View>
  );
}

function Private() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
      <EyeOff size={16} color={colors.paperMuted} />
      <Text variant="small">Sua localização não é mais compartilhada.</Text>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ fontSize: 11, color: colors.paperMuted }}>{label}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color: color ?? colors.paper }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.inkNight },
  body: { flex: 1, paddingHorizontal: 20 },
  stat: { flex: 1, backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12 },
});
