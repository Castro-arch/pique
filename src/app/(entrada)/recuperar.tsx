import { useAuthActions } from '@convex-dev/auth/react';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BENTO, Sticker } from '@/components/Bento';
import { Button } from '@/components/Button';
import { Appear } from '@/components/Motion';
import { BackButton } from '@/components/Nav';
import { OutlinedText } from '@/components/OutlinedText';
import { Text } from '@/components/Text';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts } from '@/theme/tokens';

// "Já tenho conta": volta para a sua conta em outro celular ou navegador com o
// código de recuperação gerado nos Ajustes (convex/recovery.ts).
export default function Recuperar() {
  const insets = useScreenInsets();
  const { signIn } = useAuthActions();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const shown = clean.replace(/(.{4})(?=.)/g, '$1-');

  async function go() {
    if (clean.length !== 12 || busy) return;
    setBusy(true);
    setError(null);
    const wrong = 'Esse código não confere com nenhuma conta. Confira as letras e tente de novo.';
    try {
      // código errado não dá erro: o servidor só responde sem sessão
      const { signingIn } = await signIn('recovery', { code: clean });
      // com a sessão de volta, as rotas levam para o app sozinhas
      if (signingIn) return;
      setError(wrong);
    } catch {
      setError('Não deu para entrar agora. Confira a internet e tente de novo.');
    }
    setBusy(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: BENTO.ink }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top, 20) + 8, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 12 }} keyboardShouldPersistTaps="handled">
        <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/bem-vindo'))} />
        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 20 }}>
          <Appear style={{ alignItems: 'center' }}>
            <Sticker kind="lock" color="#5AC8FA" size={92} tilt={-10} edge={colors.paper} />
            <View style={{ marginTop: 10 }}>
              <OutlinedText text="Já tenho conta" size={44} dot={colors.lime} />
            </View>
            <Text style={styles.sub}>Digite o código de recuperação que você guardou. Ele fica em Ajustes → Proteger minha conta, no aparelho antigo.</Text>
          </Appear>
          <Appear delay={90} style={{ marginTop: 22 }}>
            <View style={[styles.box, error ? { borderColor: colors.pink } : null]}>
              <TextInput
                value={shown}
                onChangeText={setCode}
                placeholder="XXXX-XXXX-XXXX"
                placeholderTextColor="#55606B"
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                maxLength={14}
                style={styles.input}
                accessibilityLabel="Código de recuperação"
                onSubmitEditing={go}
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </Appear>
        </View>
        <Button label="Entrar na minha conta" disabled={clean.length !== 12} loading={busy} onPress={go} style={{ minHeight: 60, borderRadius: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: '#C9C7BF', marginTop: 12, textAlign: 'center' },
  box: { backgroundColor: BENTO.tile, borderWidth: 2, borderColor: BENTO.line, borderRadius: 22, paddingHorizontal: 16 },
  input: { height: 64, fontFamily: fonts.display, fontSize: 26, letterSpacing: 3, color: colors.paper, textAlign: 'center' },
  error: { fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.pink, marginTop: 10, textAlign: 'center' },
});
