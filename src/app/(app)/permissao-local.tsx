import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { StepBars } from '@/components/Controls';
import { MapBackdrop, MapPin } from '@/components/MapBackdrop';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { photos } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

const promises = [
  'Só enquanto a partida está rolando. Fora dela, nada sai do celular.',
  'Caçadores te veem só nos pings, nunca ao vivo.',
  'Quando você é pego, o envio para na hora.',
];

// 1.5 Permissão de localização (explica antes do aviso do sistema)
export default function PermissaoLocal() {
  // O pedido de verdade (expo-location) entra junto com a captura de GPS do jogo.
  const next = () => router.replace('/permissao-avisos');
  return (
    <Screen>
      <StepBars total={3} current={2} />
      <View style={{ height: 220, marginTop: 20, borderRadius: radius.xxl, overflow: 'hidden' }}>
        <MapBackdrop zone={{ cx: 195, cy: 422, r: 190 }} fades={false}>
          <MapPin x={173} y={400}>
            <Avatar source={photos.castro} size={44} state="runner" glow />
          </MapPin>
        </MapBackdrop>
        <Chip label="Só durante a rodada" tone="dark" dot={colors.lime} style={{ position: 'absolute', left: 14, top: 14 }} />
      </View>

      <Headline style={{ marginTop: 22, fontSize: 36, lineHeight: 36 }}>O jogo precisa saber onde você está</Headline>
      <View style={{ gap: 12, marginTop: 18 }}>
        {promises.map((t) => (
          <View key={t} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.limeTint, alignItems: 'center', justifyContent: 'center' }}>
              <Check size={14} color={colors.lime} strokeWidth={3} />
            </View>
            <Text style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>{t}</Text>
          </View>
        ))}
      </View>

      <Spacer />
      <Text variant="small" style={{ textAlign: 'center', marginBottom: 10, fontSize: 12 }}>
        Na próxima tela, escolha <Text style={{ fontFamily: fonts.bodyStrong, color: colors.paper, fontSize: 12 }}>“Durante o uso do app”</Text>.
      </Text>
      <Button label="Permitir localização" onPress={next} />
      <Button label="Agora não" variant="link" onPress={() => router.replace('/local-desligada')} />
    </Screen>
  );
}
