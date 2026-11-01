import { Redirect, router, useNavigation } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BENTO, Sticker, type StickerKind } from '@/components/Bento';
import { BackButton } from '@/components/Nav';
import { Text } from '@/components/Text';
import { useAccessGate } from '@/lib/accessGate';
import { LEGAL_DATE, type LegalSection } from '@/lib/legal';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts } from '@/theme/tokens';

// Página de texto legal (Termos de uso, Política de privacidade): título com
// figurinha, a data e as seções em cartões, fácil de ler no celular.
export function LegalPage({ title, sticker, color, intro, sections }: { title: string; sticker: StickerKind; color: string; intro: string; sections: LegalSection[] }) {
  const insets = useScreenInsets();
  // Com uma porta pendente (convite, termos, nome), o roteador abre esta página
  // sozinho, porque ela é a primeira tela liberada. Só fica aqui quem veio
  // tocando no link (tem para onde voltar); quem caiu aqui vai para a porta.
  const gate = useAccessGate();
  const navigation = useNavigation();
  if (gate && !navigation.canGoBack()) return <Redirect href={gate} />;
  return (
    <View style={{ flex: 1, backgroundColor: BENTO.ink }}>
      <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top, 20) + 8, paddingHorizontal: 18, paddingBottom: Math.max(insets.bottom, 16) + 24 }}>
        <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace(gate ?? '/'))} />
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.date}>Atualizado em {LEGAL_DATE}</Text>
          </View>
          <Sticker kind={sticker} color={color} size={60} tilt={-8} edge={colors.paper} />
        </View>
        <Text style={styles.intro}>{intro}</Text>
        {sections.map((s, i) => (
          <View key={s.title} style={styles.card}>
            <Text style={styles.cardTitle}>
              <Text style={{ color: colors.lime, fontFamily: fonts.display }}>{i + 1}. </Text>
              {s.title}
            </Text>
            {s.body.map((p, k) => (
              <Text key={k} style={[styles.p, p.startsWith('•') && { paddingLeft: 4 }]}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 34, letterSpacing: -0.8, color: colors.paper },
  date: { fontSize: 12, fontFamily: fonts.bodyStrong, color: BENTO.muted, marginTop: 4 },
  intro: { fontSize: 15, lineHeight: 22, color: '#C9C7BF', marginTop: 14, marginBottom: 6 },
  card: { backgroundColor: BENTO.tile, borderWidth: 1, borderColor: BENTO.line, borderRadius: 20, padding: 16, marginTop: 10 },
  cardTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.paper, marginBottom: 6 },
  p: { fontSize: 14, lineHeight: 21, color: '#C9C7BF', marginTop: 6 },
});
