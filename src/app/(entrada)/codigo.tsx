import { useAuthActions } from '@convex-dev/auth/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/Button';
import { CodeInput } from '@/components/CodeInput';
import { BackButton } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

const RESEND_SECONDS = 30;

// 1.3 Código do e-mail
export default function Codigo() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useAuthActions();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function verify(value = code) {
    setLoading(true);
    setError(null);
    try {
      await signIn('email-otp', { email, code: value });
      // A guarda de rotas leva adiante quando a sessão abre.
    } catch {
      setError('Esse código não confere ou já venceu. Confere o último e-mail.');
      setLoading(false);
    }
  }

  async function resend() {
    setWait(RESEND_SECONDS);
    setCode('');
    try {
      await signIn('email-otp', { email });
    } catch {
      setError('Não consegui reenviar agora. Tenta de novo em alguns segundos.');
    }
  }

  const left = 6 - code.length;
  const mmss = `0:${String(wait).padStart(2, '0')}`;

  return (
    <Screen>
      <BackButton />
      <Headline style={{ marginTop: 14, fontSize: 44, lineHeight: 44 }}>Olha seu e-mail</Headline>
      <Text variant="muted" style={{ marginTop: 10 }}>
        Mandamos o código para <Text style={{ fontFamily: fonts.bodyStrong }}>{email}</Text>.{' '}
        <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong }} onPress={() => router.back()}>
          Trocar
        </Text>
      </Text>

      <View style={{ marginTop: 24 }}>
        <CodeInput
          label="Código de 6 números"
          value={code}
          invalid={!!error}
          autoFocus
          onChange={(v) => {
            setCode(v);
            setError(null);
            if (v.length === 6) void verify(v);
          }}
        />
      </View>
      {error ? <Text variant="error" style={{ marginTop: 12 }}>{error}</Text> : null}

      <View style={{ marginTop: 16, alignItems: 'center' }}>
        {wait > 0 ? (
          <Text variant="small">
            Não chegou? Veja o spam ou reenvie em <Text style={{ fontFamily: fonts.bodyStrong, color: colors.paper }}>{mmss}</Text>
          </Text>
        ) : (
          <Pressable accessibilityRole="button" onPress={resend} hitSlop={10}>
            <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong }}>Reenviar código</Text>
          </Pressable>
        )}
      </View>

      <Spacer />
      <Button
        label={left > 0 ? `Confirmar · faltam ${left}` : 'Confirmar'}
        disabled={left > 0}
        loading={loading}
        onPress={() => verify()}
      />
    </Screen>
  );
}
