import { useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { StepBars } from '@/components/Controls';
import { Field } from '@/components/Field';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';
import { api } from '../../convex/_generated/api';

// 1.4 Seu nome no jogo (cadastro depois do primeiro login)
export default function Nome() {
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
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : 'Não deu para salvar. Tenta de novo.');
      setLoading(false);
    }
  }

  const userOk = username.length >= 3;

  return (
    <Screen scroll>
      <StepBars total={3} current={1} />
      <Headline mark="?" style={{ marginTop: 28, fontSize: 44, lineHeight: 44 }}>
        Como a crew te chama
      </Headline>
      <Text variant="muted" style={{ marginTop: 10 }}>
        É assim que você aparece no mapa e no Radio.
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 24 }}>
        {/* Sem foto ainda: mostra a inicial do nome. O envio de foto vem com o perfil completo. */}
        <Avatar name={name || '?'} size={84} state="runner" label="Sua foto" />
        <Text variant="small" style={{ flex: 1 }}>
          Uma foto ajuda a crew a te reconhecer no mapa. Dá para trocar depois.
        </Text>
      </View>

      <View style={{ gap: 12, marginTop: 22 }}>
        <Field label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" autoComplete="name" maxLength={40} />
        <Field
          label="Usuário"
          value={username}
          onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder="seu_usuario"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          trailing={
            userOk ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Check size={16} color={colors.lime} strokeWidth={2.6} />
                <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 13 }}>ok</Text>
              </View>
            ) : null
          }
        />
      </View>
      {error ? <Text variant="error" style={{ marginTop: 12 }}>{error}</Text> : null}

      <Spacer />
      <Button
        label="Continuar"
        style={{ marginTop: 24 }}
        onPress={save}
        loading={loading}
        disabled={name.trim().length < 2 || !userOk}
      />
    </Screen>
  );
}
