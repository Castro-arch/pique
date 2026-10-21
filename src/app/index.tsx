import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { api } from '../../convex/_generated/api';

export default function Home() {
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.me);

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <Text variant="caption">@{me?.username}</Text>

        <View style={{ gap: 12 }}>
          <Text variant="hero">Oi,</Text>
          <Text variant="hero">{me?.name}.</Text>
          <Text variant="body" style={{ marginTop: 8 }}>
            Crie uma partida ou entre com o código de um amigo.
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          {/* Fase 2: lobby, código de partida e regras. */}
          <Button label="Criar partida" onPress={() => {}} disabled />
          <Button label="Entrar com código" variant="secondary" onPress={() => {}} disabled />
          <Button label="Sair da conta" variant="ghost" onPress={() => void signOut()} />
        </View>
      </View>
    </Screen>
  );
}
