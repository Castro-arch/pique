import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BENTO, Sticker } from '@/components/Bento';
import { Button } from '@/components/Button';
import { CodeInput } from '@/components/CodeInput';
import { Appear } from '@/components/Motion';
import { Logo } from '@/components/Nav';
import { OutlinedText } from '@/components/OutlinedText';
import { Text } from '@/components/Text';
import { errorInfo } from '@/lib/game';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts } from '@/theme/tokens';
import { api } from '../../convex/_generated/api';

// Teste fechado: só entra quem tem o código de convite (convex/beta.ts).
// Aparece logo depois do login, para quem ainda não digitou o código atual
// ou para quem entrou com um código que já foi trocado.
export default function TesteFechado() {
  const insets = useScreenInsets();
  const me = useQuery(api.users.me, {});
  const redeem = useMutation(api.beta.redeem);
  const { signOut } = useAuthActions();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (code.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await redeem({ code });
      // com o acesso liberado, as rotas trocam sozinhas para o app
    } catch (e) {
      setError(errorInfo(e).message);
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BENTO.ink }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top, 20) + 14, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 12 }}
        keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', height: 48, justifyContent: 'center' }}>
          <Logo />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 24 }}>
          <Appear style={{ alignItems: 'center' }}>
            <Sticker kind="lock" color={colors.pink} size={104} tilt={-10} edge={colors.paper} />
            <View style={{ marginTop: 10 }}>
              <OutlinedText text="Teste fechado" size={52} dot={colors.lime} />
            </View>
            <Text style={styles.sub}>
              {me?.betaRevoked
                ? 'O código que você usou foi trocado. Peça o código novo para quem te convidou.'
                : 'O Pique está em teste com um grupo pequeno. Digite o código de convite que você recebeu.'}
            </Text>
          </Appear>

          <Appear delay={90} style={{ marginTop: 26 }}>
            <View style={styles.card}>
              <CodeInput label="Código de convite" kind="alphanumeric" value={code} onChange={(t) => setCode(t.toUpperCase())} invalid={!!error} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          </Appear>
        </View>

        <Appear delay={140} style={{ gap: 10 }}>
          <Button label="Entrar no teste" loading={busy} disabled={code.length < 6} onPress={send} style={styles.go} />
          <Text onPress={() => signOut().catch(() => {})} style={styles.link}>
            Sair da conta
          </Text>
        </Appear>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { fontFamily: fonts.display, fontSize: 19, lineHeight: 24, letterSpacing: -0.3, color: '#C9C7BF', marginTop: 14, textAlign: 'center' },
  card: { backgroundColor: BENTO.tile, borderRadius: 26, borderWidth: 1, borderColor: BENTO.line, padding: 18 },
  error: { fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.pink, marginTop: 10, textAlign: 'center' },
  go: { minHeight: 60, borderRadius: 24 },
  link: { textAlign: 'center', fontSize: 14, fontFamily: fonts.bodyStrong, color: BENTO.muted, paddingVertical: 4 },
});
