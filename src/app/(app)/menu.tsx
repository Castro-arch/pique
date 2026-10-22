import { router, useLocalSearchParams } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Segmented } from '@/components/Controls';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

type Speed = '1' | '5' | '20';

// 7.3 Menu da partida. No treino com bots aparecem os controles extras.
export default function Menu() {
  const { treino, id } = useLocalSearchParams<{ treino?: string; id?: string }>();
  const leave = () => router.replace({ pathname: '/sair', params: id ? { id } : {} });
  const [speed, setSpeed] = useState<Speed>('1');
  const training = treino === '1';

  return (
    <View style={{ flex: 1 }}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <Sheet>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, marginTop: 14 }}>Menu da partida</Text>
        <Pressable accessibilityRole="button" onPress={leave} style={styles.leave}>
          <View style={styles.leaveIcon}>
            <LogOut size={18} color={colors.paper} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 15 }}>Preciso sair</Text>
            <Text variant="small" style={{ marginTop: 2 }}>Encerra seu jogo e avisa a crew, sem penalidade.</Text>
          </View>
        </Pressable>

        {training ? (
          <>
            <Text variant="label" style={{ marginTop: 18, marginBottom: 6, marginLeft: 6 }}>Rodada de treino · os outros jogadores são bots</Text>
            <View style={styles.list}>
              <Row label="Ping agora" onPress={() => router.replace({ pathname: '/jogo', params: { estado: 'ping' } })} />
              <Row label="Pegar o corredor mais próximo" onPress={() => router.replace('/confirmando')} />
              <Row label="Pular 1 minuto" onPress={() => router.back()} />
              <View style={[styles.row, styles.line]}>
                <Text style={{ flex: 1, fontSize: 15 }}>Velocidade</Text>
                <Segmented<Speed>
                  value={speed}
                  onChange={setSpeed}
                  style={{ width: 150 }}
                  options={[
                    { value: '1', label: '1×' },
                    { value: '5', label: '5×' },
                    { value: '20', label: '20×' },
                  ]}
                />
              </View>
              <Row label="Encerrar a rodada" last onPress={() => router.replace('/placar')} />
            </View>
          </>
        ) : null}

        <Button variant="danger" label="Sair da partida" style={{ marginTop: 18 }} onPress={leave} />
      </Sheet>
    </View>
  );
}

function Row({ label, last, onPress }: { label: string; last?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.row, !last && styles.line]}>
      <Text style={{ fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  leave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.lg,
    padding: 14,
  },
  leaveIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.inkBorder, alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: radius.lg },
  row: { minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  line: { borderBottomWidth: 1, borderBottomColor: colors.inkBorder },
});
