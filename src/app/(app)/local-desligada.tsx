import { router } from 'expo-router';
import { Lock, MapPinOff } from '@/components/icons';
import { Linking, View } from 'react-native';

import { Button } from '@/components/Button';
import { ListGroup, ListRow } from '@/components/Card';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

const steps = [
  'Abra os Ajustes do celular',
  'Toque em Pique → Localização',
  'Escolha “Durante o uso do app” e “Precisa”',
];

// 1.7 Localização desligada
export default function LocalDesligada() {
  return (
    <Screen>
      <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: colors.amberTint, alignItems: 'center', justifyContent: 'center', marginTop: 28 }}>
        <MapPinOff size={44} color={colors.amber} />
      </View>
      <Headline dot={colors.amber} style={{ marginTop: 22 }}>Sem localização, sem pique</Headline>
      <Text variant="muted" style={{ marginTop: 12 }}>
        O jogo precisa saber onde você está para mandar os pings e checar a zona. Dá pra ligar em 3 toques.
      </Text>
      <ListGroup style={{ marginTop: 20 }}>
        {steps.map((s, i) => (
          <ListRow
            key={s}
            title={s}
            last={i === steps.length - 1}
            leading={
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.limeTint, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 13 }}>{i + 1}</Text>
              </View>
            }
          />
        ))}
      </ListGroup>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Lock size={16} color={colors.lime} />
        <Text variant="small" style={{ flex: 1 }}>Mesmo ligada, sua posição só sai do celular durante a rodada.</Text>
      </View>
      <Spacer />
      <Button label="Abrir Ajustes" onPress={() => void Linking.openSettings()} />
      <Button label="Só olhar o app por enquanto" variant="link" onPress={() => router.replace('/')} />
    </Screen>
  );
}
