import { router, useLocalSearchParams } from 'expo-router';
import { Bell, Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AvatarStack } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Illustration } from '@/components/Illustration';
import { Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { illustrations, photos } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const sideName = { runner: 'corredor', hunter: 'caçador', draw: 'sorteio' } as const;

// 4.7 Aguardando a partida (com a ilustração da crew no poste)
export default function Aguardando() {
  const { lado = 'runner' } = useLocalSearchParams<{ lado?: keyof typeof sideName }>();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d % 3) + 1), 500);
    return () => clearInterval(t);
  }, []);

  const color = lado === 'hunter' ? colors.pink : lado === 'draw' ? colors.paper : colors.lime;

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 34) }]}>
      <View style={{ marginTop: Math.max(insets.top, 30) }}>
        <Illustration
          source={illustrations.aguardando}
          height={300}
          background={colors.inkNight}
          focusX={0.46}
          label="Ilustração: a crew reunida embaixo de um poste, rindo e olhando o celular antes da partida"
        />
      </View>
      <View style={styles.body}>
        <Chip label="TACO42 · lobby do Leo" dot={colors.lime} style={{ alignSelf: 'flex-start', marginBottom: 14 }} />
        <Headline variant="display" style={{ fontSize: 48, lineHeight: 46 }}>Você tá dentro</Headline>
        <Text variant="muted" style={{ marginTop: 12, fontSize: 16 }}>
          Agora é esperar o Leo começar. Você vai como{' '}
          <Text style={{ color, fontFamily: fonts.bodyStrong, fontSize: 16 }}>{sideName[lado] ?? 'corredor'}</Text>. Aproveita para se alongar.
        </Text>

        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AvatarStack sources={[photos.leo, photos.castro, photos.priya, photos.sasha, photos.jonah]} size={32} extra={0} />
            <Text style={{ fontFamily: fonts.display, fontSize: 18 }}>
              {ready ? 6 : 5}
              <Text style={{ color: colors.paperMuted, fontSize: 14 }}> de 6 prontos</Text>
            </Text>
          </View>
          <Text variant="small" style={{ marginTop: 10 }} accessibilityLiveRegion="polite">
            Teo está entrando{'.'.repeat(dots)}
          </Text>
        </View>

        <Spacer />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Bell size={16} color={colors.paperMuted} />
          <Text variant="label">Pode bloquear o celular. A gente vibra quando começar.</Text>
        </View>
        {ready ? (
          <Button variant="secondary" label="Pronto · esperando o Leo" onPress={() => router.push('/sorteio')} />
        ) : (
          <Button label="Estou pronto" icon={<Check size={18} color={colors.limeInk} strokeWidth={3} />} onPress={() => setReady(true)} />
        )}
        <Button variant="link" label="Trocar de lado" style={{ marginTop: 6 }} onPress={() => router.replace('/lado')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.inkNight },
  body: { flex: 1, paddingHorizontal: 20, marginTop: -10 },
  card: { marginTop: 18, backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 14 },
});
