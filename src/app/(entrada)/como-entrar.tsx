import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { makeRedirectUri } from 'expo-auth-session';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Mail } from '@/components/icons';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { BackButton } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

// Logos oficiais, usados como o Google e a Apple pedem nos botões de login.
const googleG = require('@/assets/images/login/google-g.png');
const appleLogo = require('@/assets/images/login/apple-logo.png');

type Provider = 'google' | 'apple';

// 1.2 Como entrar: Google, Apple ou e-mail (este último com código).
// Google e Apple só aparecem quando o servidor tem as credenciais.
export default function ComoEntrar() {
  const options = useQuery(api.users.loginOptions);
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enter(provider: Provider) {
    setError(null);
    setBusy(provider);
    try {
      const redirectTo = makeRedirectUri();
      const { redirect } = await signIn(provider, { redirectTo });
      // Na web a biblioteca leva para o Google/Apple e entende o retorno sozinha.
      if (Platform.OS === 'web' || !redirect) return;
      const result = await WebBrowser.openAuthSessionAsync(redirect.toString(), redirectTo);
      if (result.type !== 'success') return;
      const code = new URL(result.url).searchParams.get('code');
      if (code) await signIn(provider, { code });
    } catch {
      setError('Não deu para entrar agora. Tente de novo ou use o e-mail.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <BackButton />
      <Headline mark="?" style={{ marginTop: 14 }}>Como você quer entrar</Headline>
      <Text variant="muted" style={{ marginTop: 10 }}>
        Sem senha para lembrar. Os outros jogadores só veem seu nome e sua foto.
      </Text>

      <Spacer />

      <View style={{ gap: 10 }}>
        {options?.google ? (
          <LoginButton
            label="Continuar com o Google"
            bg="#F2F2F2"
            fg="#1F1F1F"
            busy={busy === 'google'}
            onPress={() => enter('google')}
            icon={<Image source={googleG} style={{ width: 20, height: 20 }} contentFit="contain" />}
          />
        ) : null}
        {options?.apple ? (
          <LoginButton
            label="Continuar com a Apple"
            bg="#000000"
            fg="#FFFFFF"
            border={colors.inkBorder}
            busy={busy === 'apple'}
            onPress={() => enter('apple')}
            // O arquivo da Apple tem margem própria: na altura do botão, o logo fica com ~20 px.
            icon={<Image source={appleLogo} style={{ width: 54, height: 54, marginLeft: -16, marginRight: -8 }} contentFit="contain" />}
          />
        ) : null}
        <LoginButton
          label="Continuar com e-mail"
          bg={colors.inkRaised}
          fg={colors.paper}
          border={colors.inkBorder}
          onPress={() => router.push('/email')}
          icon={<Mail size={20} color={colors.lime} strokeWidth={2.2} />}
        />
      </View>

      {error ? <Text variant="error" style={{ marginTop: 12, textAlign: 'center' }}>{error}</Text> : null}

      <Text variant="label" style={{ textAlign: 'center', marginTop: 16, fontSize: 11 }}>
        Ao continuar, você aceita os <Text style={styles.link}>Termos</Text> e a <Text style={styles.link}>Política de privacidade</Text>.
      </Text>
    </Screen>
  );
}

function LoginButton({
  label,
  bg,
  fg,
  border,
  icon,
  busy,
  onPress,
}: {
  label: string;
  bg: string;
  fg: string;
  border?: string;
  icon: ReactNode;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: !!busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        border ? { borderWidth: 1, borderColor: border } : null,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={{ color: fg, fontFamily: fonts.bodyStrong, fontSize: 16 }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  link: { color: colors.paper, fontSize: 11, textDecorationLine: 'underline' },
});
