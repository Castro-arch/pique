import { router, useLocalSearchParams } from 'expo-router';
import { ImageIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Illustration } from '@/components/Illustration';
import { Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { illustrations, match } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

// 8.4 a 8.6 Fim de rodada para quem venceu.
// ?lado=corredor (padrão): "Ninguém te achou", com a ilustração da comemoração.
// ?lado=cacador: "Limpou geral". A ilustração do caçador ainda vai chegar;
// até lá fica o espaço reservado no mesmo tamanho.
// ?lado=cacador&estilo=simples: versão sem ilustração, só números.
export default function Fim() {
  const { lado = 'corredor', estilo } = useLocalSearchParams<{ lado?: string; estilo?: string }>();
  const insets = useSafeAreaInsets();
  const hunter = lado === 'cacador';
  const accent = hunter ? colors.pink : colors.lime;
  const simple = hunter && estilo === 'simples';

  const stats = hunter
    ? [
        ['Você pegou', '3'],
        ['Distância', '3,4 km'],
        ['Pega mais rápida', '2:41'],
      ]
    : [
        ['Escondido', '30:00'],
        ['Distância', '1,9 km'],
        ['Pings livres', '14'],
      ];

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 34), paddingTop: simple ? Math.max(insets.top, 56) : 0 }]}>
      {simple ? null : (
        <View style={{ marginTop: Math.max(insets.top, 30) }}>
          {hunter ? (
            <Placeholder />
          ) : (
            <Illustration source={illustrations.sobreviveu} label="Ilustração: a crew comemorando que ninguém foi achado" />
          )}
        </View>
      )}
      <View style={[styles.body, !simple && { marginTop: -10 }]}>
        <Chip
          label={simple ? `Fim de jogo · 28:18 · ${match.code} · Rodada ${match.round}` : hunter ? 'Caçadores venceram · 28:18' : 'Sobreviveu · 30:00'}
          tone={hunter ? 'hunter' : 'runner'}
          dot={accent}
          style={{ alignSelf: 'flex-start', marginBottom: 14 }}
        />
        <Headline variant="display" dot={accent} style={{ fontSize: simple ? 72 : 56, lineHeight: simple ? 66 : 52 }}>
          {hunter ? 'Limpou\ngeral' : 'Ninguém\nte achou'}
        </Headline>
        <Text variant="muted" style={{ marginTop: 12, fontSize: 16 }}>
          {simple
            ? 'Todos os corredores foram encontrados. Direito de se gabar: ilimitado.'
            : hunter
              ? 'Todos os corredores foram achados com 1:42 de sobra. Você pegou 3, mais que qualquer um.'
              : 'Você ficou escondido a rodada inteira. O Leo passou a 38 m de você e não te viu.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
          {stats.map(([l, v]) => (
            <View key={l} style={styles.stat}>
              <Text style={{ fontSize: 11, color: colors.paperMuted }}>{l}</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: l === stats[0][0] ? accent : colors.paper }}>{v}</Text>
            </View>
          ))}
        </View>
        <Spacer />
        {simple ? (
          <>
            <Button label="Revanche com a mesma crew" onPress={() => router.replace('/sorteio')} />
            <Text variant="label" style={{ textAlign: 'center', marginTop: 8 }}>Mesma zona e regras. Os papéis são sorteados de novo.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button variant="secondary" label="Foto da crew" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/post', params: { visual: 'selfie' } })} />
              <Button variant="secondary" label="Voltar ao lobby" style={{ flex: 1 }} onPress={() => router.replace('/lobby')} />
            </View>
          </>
        ) : (
          <>
            <Button
              variant={hunter ? 'danger' : 'primary'}
              label="Compartilhar a vitória"
              onPress={() => router.push({ pathname: '/post', params: { lado } })}
            />
            <Button variant="link" label="Revanche com a mesma crew" style={{ marginTop: 6 }} onPress={() => router.replace('/sorteio')} />
          </>
        )}
      </View>
    </View>
  );
}

function Placeholder() {
  return (
    <View style={styles.placeholder} accessible accessibilityRole="image" accessibilityLabel="Espaço reservado para a ilustração do caçador vencendo">
      <ImageIcon size={32} color={colors.inkMuted} />
      <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14, marginTop: 8 }}>Ilustração do caçador vencendo</Text>
      <Text variant="label" style={{ marginTop: 2 }}>1672 × 941 · mesmo estilo das outras</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.inkNight },
  body: { flex: 1, paddingHorizontal: 20 },
  stat: { flex: 1, backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12 },
  placeholder: {
    height: 300,
    marginHorizontal: 20,
    borderRadius: radius.xxl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.inkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
