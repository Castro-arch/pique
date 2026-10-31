import { useAuthActions } from '@convex-dev/auth/react';
import { router } from 'expo-router';
import { Lock } from '@/components/icons';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { BackButton } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { colors } from '@/theme/tokens';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 1.2 Entrar com e-mail
export default function Email() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = email.trim().toLowerCase();

  async function send() {
    if (!EMAIL_RE.test(clean)) {
      setError('Confere o e-mail: parece que falta alguma parte.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn('email-otp', { email: clean });
      router.push({ pathname: '/codigo', params: { email: clean } });
    } catch {
      setError('Não consegui enviar o código agora. Tenta de novo em alguns segundos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <BackButton />
      <Headline dot={colors.lime} mark="?" style={{ marginTop: 14, fontSize: 44, lineHeight: 44 }}>
        {'Qual é seu e‑mail'}
      </Headline>
      <Text variant="muted" style={{ marginTop: 10 }}>
        A gente manda um código de 6 números. Sem senha para lembrar.
      </Text>

      <View style={{ marginTop: 24 }}>
        <Field
          label="E-mail"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          placeholder="voce@exemplo.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={send}
          invalid={!!error}
          autoFocus
        />
      </View>
      {error ? <Text variant="error" style={{ marginTop: 10 }}>{error}</Text> : null}

      <Card style={{ marginTop: 14, flexDirection: 'row', gap: 10, paddingVertical: 12 }}>
        <Lock size={18} color={colors.lime} />
        <Text variant="small" style={{ flex: 1 }}>
          Seu e-mail só serve para você voltar à conta num celular novo. Os outros jogadores nunca veem.
        </Text>
      </Card>

      <Spacer />
      <Button label="Enviar código" onPress={send} loading={loading} disabled={!clean} />
    </Screen>
  );
}
