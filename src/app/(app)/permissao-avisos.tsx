import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { StepBars } from '@/components/Controls';
import { Screen, Spacer } from '@/components/Screen';
import { Notice } from '@/components/Notice';
import { Headline, Text } from '@/components/Text';

const samples = [
  { title: 'Ping! Sua posição foi enviada.', body: 'Os caçadores estão olhando. Se mexa.', when: 'agora' },
  { title: 'A zona encolhe em 1 min', body: 'Vai de 420 m para 300 m.', when: '2 min' },
  { title: 'Fim de rodada!', body: 'Abra para ver quem ganhou.', when: '5 min' },
];

// 1.6 Permissão de avisos
export default function PermissaoAvisos() {
  // O pedido de verdade (expo-notifications) entra junto com o push do jogo.
  const done = () => router.replace('/');
  return (
    <Screen>
      <StepBars total={3} current={3} />
      <View style={{ gap: 8, marginTop: 22 }} accessibilityLabel="Exemplos de avisos com a tela bloqueada">
        {samples.map((n, i) => (
          <Notice key={n.title} {...n} opacity={1 - i * 0.17} />
        ))}
      </View>
      <Headline style={{ marginTop: 26, fontSize: 36, lineHeight: 36 }}>Jogue com o celular no bolso</Headline>
      <Text variant="muted" style={{ marginTop: 12 }}>
        Os avisos chegam com a tela bloqueada e vibram, para você não precisar ficar olhando. Só durante a partida.
      </Text>
      <Spacer />
      <Button label="Ativar avisos" onPress={done} />
      <Button label="Agora não" variant="link" onPress={done} />
    </Screen>
  );
}
