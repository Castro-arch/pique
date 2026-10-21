import { useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { api } from '../../convex/_generated/api';

export default function Profile() {
  const setProfile = useMutation(api.users.setProfile);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      await setProfile({ name, username });
      // A guarda de rotas leva para a home assim que o perfil existe.
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : 'Não foi possível salvar. Tente de novo.');
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
        <View style={{ gap: 12 }}>
          <Text variant="title">Como te chamam?</Text>
          <Text variant="body">Seus amigos vão te achar pelo usuário.</Text>
        </View>

        <Field
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder="Seu nome"
          autoComplete="name"
          maxLength={40}
        />
        <Field
          label="Usuário"
          value={username}
          onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder="seu_usuario"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />

        {error ? <Text variant="error">{error}</Text> : null}

        <Button
          label="Continuar"
          onPress={save}
          loading={loading}
          disabled={name.trim().length < 2 || username.length < 3}
        />
      </View>
    </Screen>
  );
}
