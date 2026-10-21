import { useAuthActions } from '@convex-dev/auth/react';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanEmail = email.trim().toLowerCase();

  async function sendCode() {
    if (!EMAIL_RE.test(cleanEmail)) {
      setError('Digite um e-mail válido.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn('email-otp', { email: cleanEmail });
      setStep('code');
    } catch {
      setError('Não consegui enviar o código. Tente de novo em instantes.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    setError(null);
    try {
      await signIn('email-otp', { email: cleanEmail, code: code.trim() });
      // A guarda de rotas leva o usuário adiante quando a sessão abre.
    } catch {
      setError('Código incorreto ou expirado.');
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
        <View style={{ gap: 12 }}>
          <Text variant="hero">Pique.</Text>
          <Text variant="body">
            {step === 'email'
              ? 'Entre com seu e-mail. Sem senha: a gente manda um código.'
              : `Enviamos um código de 6 dígitos para ${cleanEmail}.`}
          </Text>
        </View>

        {step === 'email' ? (
          <Field
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@exemplo.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            onSubmitEditing={sendCode}
          />
        ) : (
          <Field
            label="Código"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            onSubmitEditing={verifyCode}
          />
        )}

        {error ? <Text variant="error">{error}</Text> : null}

        <View style={{ gap: 8 }}>
          {step === 'email' ? (
            <Button label="Receber código" onPress={sendCode} loading={loading} />
          ) : (
            <>
              <Button
                label="Entrar"
                onPress={verifyCode}
                loading={loading}
                disabled={code.length !== 6}
              />
              <Button
                label="Usar outro e-mail"
                variant="ghost"
                onPress={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                }}
              />
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}
