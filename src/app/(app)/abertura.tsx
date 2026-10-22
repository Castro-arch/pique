import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

// 9.1 Abertura: o ícone e o nome, enquanto o app carrega.
// Os arquivos do ícone na loja ficam em assets/images (icon.png, adaptive-icon).
export default function Abertura() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/'), 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={styles.root}>
      <View style={styles.icon} accessibilityRole="image" accessibilityLabel="Ícone do Pique">
        <View style={styles.dot} />
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: 48, letterSpacing: -1.6, marginTop: 22 }}>pique</Text>
      <Text variant="muted" style={{ marginTop: 2 }}>pique-esconde pela cidade</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 120, height: 120, borderRadius: 30, backgroundColor: colors.limeInk, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.lime },
});
