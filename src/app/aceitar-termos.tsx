import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BENTO, Sticker, type StickerKind } from '@/components/Bento';
import { Button } from '@/components/Button';
import { Check } from '@/components/icons';
import { Appear, Pressy } from '@/components/Motion';
import { Logo } from '@/components/Nav';
import { OutlinedText } from '@/components/OutlinedText';
import { Text } from '@/components/Text';
import { errorInfo } from '@/lib/game';
import { LEGAL_VERSION } from '@/lib/legal';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts } from '@/theme/tokens';
import { api } from '../../convex/_generated/api';

// Aceite dos Termos de uso e da Política de privacidade (e da idade mínima),
// logo depois do convite. Volta a aparecer quando LEGAL_VERSION muda.
export default function AceitarTermos() {
  const insets = useScreenInsets();
  const accept = useMutation(api.users.acceptTerms);
  const { signOut } = useAuthActions();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setError(null);
    try {
      await accept({ version: LEGAL_VERSION });
    } catch (e) {
      setError(errorInfo(e).message);
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BENTO.ink }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top, 20) + 14, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
        <View style={{ alignItems: 'center', height: 48, justifyContent: 'center' }}>
          <Logo />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 20 }}>
          <Appear style={{ alignItems: 'center' }}>
            <OutlinedText text="Antes de jogar" size={46} dot={colors.lime} />
            <Text style={styles.sub}>O Pique é jogado na rua, com a localização de verdade. Dá uma lida no essencial:</Text>
          </Appear>

          <Appear delay={80} style={{ gap: 8, marginTop: 20 }}>
            <Point sticker="pin" color="#5AC8FA" text="Sua localização só sai do celular durante a rodada, e só quem está na partida vê." />
            <Point sticker="hand" color={colors.pink} text="Cuide de você: respeite o trânsito e não entre em lugares sem permissão." />
            <Point sticker="ghost" color="#B57CFF" text="Áudios do rádio somem no fim da rodada; a partida é apagada em 7 dias." />
          </Appear>

          <Appear delay={130} style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Pressy accessibilityRole="link" onPress={() => router.push('/termos')} style={styles.doc}>
              <Text style={styles.docText}>Termos de uso ›</Text>
            </Pressy>
            <Pressy accessibilityRole="link" onPress={() => router.push('/privacidade')} style={styles.doc}>
              <Text style={styles.docText}>Privacidade ›</Text>
            </Pressy>
          </Appear>
        </View>

        <Appear delay={170} style={{ gap: 10 }}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: ok }} onPress={() => setOk(!ok)} style={styles.check}>
            <View style={[styles.box, ok && { backgroundColor: colors.lime, borderColor: colors.lime }]}>{ok ? <Check size={16} color={BENTO.ink} strokeWidth={3.4} /> : null}</View>
            <Text style={styles.checkText}>Li e aceito os Termos de uso e a Política de privacidade, e tenho 18 anos ou mais.</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Aceitar e continuar" disabled={!ok} loading={busy} onPress={go} style={{ minHeight: 60, borderRadius: 24 }} />
          <Text onPress={() => signOut().catch(() => {})} style={styles.link}>
            Sair da conta
          </Text>
        </Appear>
      </ScrollView>
    </View>
  );
}

function Point({ sticker, color, text }: { sticker: StickerKind; color: string; text: string }) {
  return (
    <View style={styles.point}>
      <Sticker kind={sticker} color={color} size={34} tilt={-6} edge={colors.paper} />
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { fontFamily: fonts.display, fontSize: 18, lineHeight: 23, letterSpacing: -0.3, color: '#C9C7BF', marginTop: 12, textAlign: 'center' },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: BENTO.tile, borderWidth: 1, borderColor: BENTO.line, borderRadius: 18, padding: 12 },
  pointText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.paper },
  doc: { flex: 1, height: 44, borderRadius: 999, borderWidth: 1.5, borderColor: BENTO.line, alignItems: 'center', justifyContent: 'center' },
  docText: { fontSize: 14, fontFamily: fonts.bodyStrong, color: colors.lime },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: '#55606B', alignItems: 'center', justifyContent: 'center' },
  checkText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.paper },
  error: { fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.pink, textAlign: 'center' },
  link: { textAlign: 'center', fontSize: 14, fontFamily: fonts.bodyStrong, color: BENTO.muted, paddingVertical: 4 },
});
