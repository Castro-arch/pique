import { router } from 'expo-router';
import { Check, Info } from '@/components/icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Segmented } from '@/components/Controls';
import { BackButton } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

type Side = 'runner' | 'hunter';
type Level = 'facil' | 'normal' | 'dificil';

// 2.5 Treino com bots
export default function Treino() {
  const [side, setSide] = useState<Side>('runner');
  const [level, setLevel] = useState<Level>('normal');
  return (
    <Screen>
      <BackButton />
      <Headline style={{ marginTop: 14 }}>Treino com bots</Headline>
      <Text variant="muted" style={{ marginTop: 10 }}>
        Uma rodada de 5 minutos para pegar o jeito. Dá pra jogar em casa: os bots andam pelo mapa por você.
      </Text>

      <Text variant="label" style={{ marginTop: 22, marginBottom: 8, marginLeft: 6 }}>Você treina como</Text>
      <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
        <SideCard on={side === 'runner'} onPress={() => setSide('runner')} role="runner" title="Corredor" body="Se esconda de 2 caçadores bots" />
        <SideCard on={side === 'hunter'} onPress={() => setSide('hunter')} role="hunter" title="Caçador" body="Ache 3 corredores bots pelos pings" />
      </View>

      <Text variant="label" style={{ marginTop: 20, marginBottom: 8, marginLeft: 6 }}>Dificuldade</Text>
      <Segmented<Level>
        value={level}
        onChange={setLevel}
        options={[
          { value: 'facil', label: 'Fácil' },
          { value: 'normal', label: 'Normal' },
          { value: 'dificil', label: 'Difícil' },
        ]}
      />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <Info size={16} color={colors.lime} />
        <Text variant="small" style={{ flex: 1 }}>
          No treino tem botões extras no menu: ping agora, pular 1 minuto e acelerar o tempo.
        </Text>
      </View>

      <Spacer />
      <Button
        label="Começar treino · 5 min"
        onPress={() => router.push({ pathname: '/jogo', params: { estado: side === 'runner' ? 'corredor-vantagem' : 'cacador-espera', treino: '1' } })}
      />
    </Screen>
  );
}

function SideCard({ on, onPress, role, title, body }: { on: boolean; onPress: () => void; role: Side; title: string; body: string }) {
  const runner = role === 'runner';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${title}. ${body}`}
      onPress={onPress}
      style={[
        styles.card,
        on ? { backgroundColor: colors.lime } : { backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder },
      ]}>
      <View style={[styles.badge, { backgroundColor: on ? colors.limeInk : colors.ink }]}>
        <View
          style={
            runner
              ? { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.lime }
              : { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: colors.pink }
          }
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 16, color: on ? colors.limeInk : colors.paper }}>{title}</Text>
        <Text style={{ fontSize: 13, marginTop: 2, color: on ? colors.limeInk : colors.paperMuted }}>{body}</Text>
      </View>
      {on ? <Check size={22} color={colors.limeInk} strokeWidth={3} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 14 },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
