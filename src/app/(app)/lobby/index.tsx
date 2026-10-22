import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { ChevronLeft, QrCode } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { SidePicker, type Side } from '@/components/RoleTag';
import { Screen, Spacer } from '@/components/Screen';
import { Text } from '@/components/Text';
import { match, players } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

const roleWord = { runner: 'corredor', hunter: 'caçador', draw: 'sorteio' } as const;

// 5.1 Lobby do anfitrião
export default function Lobby() {
  const [side, setSide] = useState<Side>('runner');
  const [copied, setCopied] = useState(false);
  const r = match.rules;

  const share = () =>
    Share.share({ message: `Bora jogar Pique? Entra com o código ${match.code} ou pelo link https://pique.app/p/${match.code}` });
  const copy = async () => {
    await Clipboard.setStringAsync(match.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Screen scroll>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/sair?de=lobby')} style={styles.back}>
          <ChevronLeft size={20} color={colors.lime} strokeWidth={2.4} />
          <Text style={{ color: colors.lime, fontFamily: fonts.bodyMedium, fontSize: 15 }}>Sair</Text>
        </Pressable>
        <Text variant="small">Você é o anfitrião</Text>
      </View>

      <View style={styles.code}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 0.5, color: colors.limeInk }}>CÓDIGO DA PARTIDA</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Mostrar QR" onPress={() => router.push('/lobby/qr')} hitSlop={10} style={styles.qrBtn}>
            <QrCode size={16} color={colors.limeInk} />
            <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.limeInk }}>Mostrar QR</Text>
          </Pressable>
        </View>
        <Text style={styles.codeText}>{match.code}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Pressable accessibilityRole="button" onPress={share} style={[styles.pill, { flex: 1, backgroundColor: colors.limeInk }]}>
            <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 14 }}>Compartilhar</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={copy} style={[styles.pill, { borderWidth: 1.5, borderColor: colors.limeInk, paddingHorizontal: 18 }]}>
            <Text style={{ color: colors.limeInk, fontFamily: fonts.bodyStrong, fontSize: 14 }}>{copied ? 'Copiado' : 'Copiar'}</Text>
          </Pressable>
        </View>
      </View>

      <Text variant="small" style={styles.label}>Regras da casa · começam no padrão mais jogado</Text>
      <View style={styles.grid}>
        <Rule label="Rodada" value={r.durationMin} unit="min" />
        <Rule label="Ping a cada" value={r.pingEveryMin} unit="min" />
        <Rule label="Vantagem" value={r.headStartMin} unit="min" />
        <Rule label="Zona" value={r.zoneMeters} unit="m" />
        <Rule label="Encolhe a cada" value={r.shrinkEveryMin} unit="min" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zona de jogo ligada. Editar no mapa"
          onPress={() => router.push('/zona')}
          style={[styles.rule, { backgroundColor: colors.limeTint, borderColor: colors.lime }]}>
          <Text style={{ fontSize: 11, color: colors.lime }}>Zona de jogo</Text>
          <Text style={[styles.ruleValue, { color: colors.lime }]}>Ligada</Text>
        </Pressable>
      </View>
      <Text variant="label" style={{ marginTop: 8 }}>A zona encolhe de {r.zoneMeters} m para 150 m depois da vantagem.</Text>

      <Text variant="small" style={styles.label}>Você joga como</Text>
      <SidePicker value={side} onChange={setSide} />

      <Pressable accessibilityRole="button" accessibilityLabel="Ver jogadores" onPress={() => router.push('/lobby/jogadores')}>
        <View style={[styles.label, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }]}>
          <Text variant="small">Jogadores</Text>
          <Text variant="label">2 caçadores · 3 corredores · 1 sorteio</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {players.map((p) => {
            const s = p.id === 'castro' ? side : p.role;
            return (
              <View key={p.id} style={{ alignItems: 'center', width: 52 }}>
                <Avatar source={p.photo} size={42} state={s === 'draw' ? 'draw' : s} />
                <Text style={{ fontSize: 11, marginTop: 4 }}>{p.id === 'castro' ? 'Você' : p.name}</Text>
                <Text style={{ fontSize: 10, color: s === 'runner' ? colors.lime : s === 'hunter' ? colors.pink : colors.paperMuted }}>
                  {roleWord[s]}
                </Text>
              </View>
            );
          })}
        </View>
      </Pressable>

      <Spacer />
      <Button label="Começar partida" style={{ marginTop: 20 }} onPress={() => router.push('/sorteio')} />
    </Screen>
  );
}

function Rule({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${value} ${unit}. Editar regras`} onPress={() => router.push('/lobby/regras')} style={styles.rule}>
      <Text style={{ fontSize: 11, color: colors.paperMuted }}>{label}</Text>
      <Text style={styles.ruleValue}>
        {value}
        <Text style={{ fontFamily: fonts.display, fontSize: 13 }}> {unit}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 44 },
  code: { backgroundColor: colors.lime, borderRadius: radius.xl, paddingVertical: 14, paddingHorizontal: 18, marginTop: 12 },
  codeText: { fontFamily: fonts.display, fontSize: 56, lineHeight: 60, letterSpacing: -1.6, color: colors.limeInk, marginTop: 2 },
  qrBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 16, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rule: {
    width: '31.6%',
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ruleValue: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
});
