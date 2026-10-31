import { useMutation } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Perk } from '@/components/Perk';
import { Screen, Spacer } from '@/components/Screen';
import { Text } from '@/components/Text';
import { pricing } from '@/lib/demo';
import { errorInfo } from '@/lib/game';
import { api } from '../../../convex/_generated/api';
import { colors, fonts, radius } from '@/theme/tokens';

type Plan = 'noite' | 'vitalicio';

// 3.7 Desbloquear hospedagem. Preços do documento: 3 partidas grátis,
// Passe da Noite (consumível) e Host Vitalício (compra única).
// A compra real entra com RevenueCat; no beta o botão libera de graça.
export default function Hospedar() {
  const [plan, setPlan] = useState<Plan>('vitalicio');
  const price = plan === 'noite' ? pricing.nightPass : pricing.lifetime;
  const unlock = useMutation(api.games.betaUnlock);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      await unlock({ plan });
      router.replace({ pathname: '/compra', params: { plano: plan } });
    } catch (e) {
      setError(errorInfo(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen background={colors.lime} scroll>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ alignSelf: 'flex-start', height: 44, justifyContent: 'center' }}>
        <Text style={{ color: colors.limeInk, opacity: 0.7, fontFamily: fonts.bodyMedium, fontSize: 15 }}>Agora não</Text>
      </Pressable>

      <Spacer />
      <Text accessibilityRole="header" style={styles.hero}>
        Mande no jogo<Text style={[styles.hero, { color: colors.paper }]}>.</Text>
      </Text>
      <Text style={styles.sub}>Escolha a zona, o relógio e as regras. Depois mande o código para a crew.</Text>

      <View style={{ gap: 12, marginTop: 20 }}>
        <Perk>{`Suas ${pricing.freeHostedMatches} primeiras partidas como anfitrião são grátis`}</Perk>
        <Perk>Seus amigos sempre entram de graça</Perk>
        <Perk>Sem assinatura. Nada renova sozinho.</Perk>
      </View>

      <View accessibilityRole="radiogroup" style={{ gap: 10, marginTop: 22 }}>
        <PlanCard
          on={plan === 'noite'}
          onPress={() => setPlan('noite')}
          title="Passe da Noite"
          price={pricing.nightPass}
          body="Hospede quantas partidas quiser por 12 horas."
        />
        <PlanCard
          on={plan === 'vitalicio'}
          onPress={() => setPlan('vitalicio')}
          title="Host Vitalício"
          price={pricing.lifetime}
          body="Hospedagem liberada para sempre nesta conta."
          tag="Mais escolhido"
        />
      </View>

      <Button
        variant="dark"
        label={`${plan === 'noite' ? 'Comprar passe' : 'Desbloquear para sempre'} · ${price}`}
        style={{ marginTop: 18, minHeight: 58 }}
        loading={busy}
        onPress={buy}
      />
      <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: colors.limeInk, opacity: 0.75 }}>No beta é de graça: nada é cobrado.</Text>
      {error ? <Text variant="error" style={{ marginTop: 6, textAlign: 'center' }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" style={{ height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
        <Text style={{ color: colors.limeInk, fontFamily: fonts.bodyStrong, fontSize: 14 }}>Restaurar compra</Text>
      </Pressable>
    </Screen>
  );
}

function PlanCard({ on, onPress, title, price, body, tag }: { on: boolean; onPress: () => void; title: string; price: string; body: string; tag?: string }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${title}, ${price}. ${body}`}
      onPress={onPress}
      style={[styles.plan, on ? { backgroundColor: colors.limeInk } : { borderWidth: 2, borderColor: 'rgba(22,32,10,0.25)' }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 16, color: on ? colors.paper : colors.limeInk }}>{title}</Text>
          {tag ? (
            <View style={[styles.tag, { backgroundColor: on ? colors.lime : colors.limeInk }]}>
              <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: on ? colors.limeInk : colors.lime }}>{tag}</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 13, marginTop: 3, color: on ? colors.paperSoft : colors.limeInk, opacity: on ? 1 : 0.8 }}>{body}</Text>
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color: on ? colors.lime : colors.limeInk }}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { fontFamily: fonts.display, fontSize: 72, lineHeight: 68, letterSpacing: -4, color: colors.limeInk },
  sub: { fontFamily: fonts.display, fontSize: 21, lineHeight: 24, letterSpacing: -0.4, color: colors.limeInk, marginTop: 16 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 16 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
});
