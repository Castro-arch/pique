import { router, useLocalSearchParams } from 'expo-router';
import { CreditCard } from '@/components/icons';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { Button } from '@/components/Button';
import { Perk } from '@/components/Perk';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { pricing } from '@/lib/demo';
import { useMe } from '@/lib/useMe';
import { colors, fonts, radius } from '@/theme/tokens';

// 3.8 Compra concluída e 3.9 Erro no pagamento (?erro=1).
export default function Compra() {
  const { plano = 'vitalicio', erro } = useLocalSearchParams<{ plano?: string; erro?: string }>();
  const night = plano === 'noite';
  return erro === '1' ? <Erro price={night ? pricing.nightPass : pricing.lifetime} /> : <Ok night={night} />;
}

function Ok({ night }: { night: boolean }) {
  const me = useMe();
  return (
    <Screen background={colors.lime}>
      <Svg width="100%" height={200} viewBox="0 0 350 200" style={{ marginTop: 30 }} accessibilityElementsHidden>
        <G fill={colors.limeInk} opacity={0.9}>
          <Rect x={40} y={30} width={10} height={22} rx={3} transform="rotate(-20 45 41)" />
          <Rect x={300} y={44} width={10} height={22} rx={3} transform="rotate(25 305 55)" />
          <Rect x={250} y={12} width={8} height={16} rx={3} transform="rotate(-35 254 20)" />
          <Rect x={90} y={150} width={8} height={18} rx={3} transform="rotate(40 94 159)" />
          <Rect x={270} y={150} width={10} height={20} rx={3} transform="rotate(-15 275 160)" />
        </G>
        <G fill={colors.paper}>
          <Path d="M70 100l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
          <Path d="M285 100l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
        </G>
        <Circle cx={175} cy={100} r={74} fill={colors.limeInk} />
        <Path d="M140 100l24 24 48-48" stroke={colors.lime} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text accessibilityRole="header" style={styles.hero}>
        Agora você manda<Text style={[styles.hero, { color: colors.paper }]}>.</Text>
      </Text>
      <Text style={{ fontSize: 16, lineHeight: 23, marginTop: 12, color: colors.limeInk, opacity: 0.8 }}>
        {night
          ? 'Passe da Noite ativo pelas próximas 12 horas. Seus amigos continuam entrando de graça.'
          : 'Hospedagem liberada para sempre nesta conta. Seus amigos continuam entrando de graça.'}
      </Text>
      <View style={{ gap: 12, marginTop: 22 }}>
        <Perk>Partidas ilimitadas, até 20 pessoas</Perk>
        <Perk>Regras e zonas salvas para repetir</Perk>
      </View>
      <Spacer />
      <Text style={{ fontSize: 12, textAlign: 'center', color: colors.limeInk, opacity: 0.7, marginBottom: 10 }}>
        Recibo enviado para {me.email}
      </Text>
      <Button variant="dark" label="Criar minha primeira partida" style={{ minHeight: 58 }} onPress={() => router.replace('/lobby')} />
    </Screen>
  );
}

function Erro({ price }: { price: string }) {
  const tips = [
    'Confira se o cartão da loja está válido e com limite.',
    'Se for conta de menor de idade, o responsável precisa aprovar.',
    'Já pagou antes em outro celular? Use Restaurar compra.',
  ];
  return (
    <Screen>
      <Button variant="link" label="Fechar" style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} onPress={() => router.back()} />
      <View style={styles.icon}>
        <CreditCard size={40} color={colors.amber} strokeWidth={2} />
      </View>
      <Headline dot={colors.amber} style={{ marginTop: 22 }}>O pagamento não passou</Headline>
      <Text variant="muted" style={{ marginTop: 12 }}>
        Nada foi cobrado. A loja do celular recusou a compra, e isso costuma ser fácil de resolver.
      </Text>
      <View style={styles.list}>
        {tips.map((t, i) => (
          <View key={t} style={[styles.li, i < tips.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.inkBorder }]}>
            <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong }}>{i + 1}</Text>
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{t}</Text>
          </View>
        ))}
      </View>
      <Spacer />
      <Button label={`Tentar de novo · ${price}`} onPress={() => router.back()} />
      <Button variant="link" label="Restaurar compra" style={{ marginTop: 6 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { fontFamily: fonts.display, fontSize: 58, lineHeight: 56, letterSpacing: -3, color: colors.limeInk, marginTop: 20 },
  icon: { width: 88, height: 88, borderRadius: radius.xxl, backgroundColor: colors.amberTint, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  list: { marginTop: 20, backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: radius.lg },
  li: { flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
});
