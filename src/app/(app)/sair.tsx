import { router, useLocalSearchParams } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

// 7.4 Confirmar saída (do jogo ou do lobby).
export default function Sair() {
  const { de } = useLocalSearchParams<{ de?: string }>();
  const lobby = de === 'lobby';
  const points = lobby
    ? ['A crew continua no lobby.', 'Se você era o anfitrião, quem está há mais tempo assume.', 'Dá para voltar pelo mesmo código.']
    : ['Sua localização para de ser enviada na hora.', 'A crew recebe um aviso de que você saiu.', 'Sem penalidade. Suas estatísticas não contam esta rodada.'];

  return (
    <View style={{ flex: 1 }}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <Sheet>
        <View accessibilityRole="alert">
          <View style={styles.icon}>
            <LogOut size={26} color={colors.pink} />
          </View>
          <Text style={styles.title}>{lobby ? 'Sair do lobby?' : 'Sair da partida?'}</Text>
          <View style={{ gap: 10, marginTop: 14 }}>
            {points.map((p) => (
              <View key={p} style={{ flexDirection: 'row', gap: 10 }}>
                <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong }}>✓</Text>
                <Text style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{p}</Text>
              </View>
            ))}
          </View>
        </View>
        <Button variant="danger" label={lobby ? 'Sair do lobby' : 'Sair da partida'} style={{ marginTop: 22 }} onPress={() => router.replace(lobby ? '/' : '/saiu')} />
        <Button
          variant="secondary"
          label={lobby ? 'Ficar no lobby' : 'Continuar jogando'}
          style={{ marginTop: 8, backgroundColor: colors.ink }}
          onPress={() => router.back()}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.pinkTint, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -1, marginTop: 14, color: colors.paper },
});
