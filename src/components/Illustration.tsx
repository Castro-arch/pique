import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

// Ilustração no topo das telas de momento (achado, aguardando, sobreviveu).
// Some aos poucos em cima e embaixo e se mistura com o fundo.
export function Illustration({
  source,
  height = 300,
  background = colors.inkNight,
  focusX = 0.46,
  label,
}: {
  source: number;
  height?: number;
  background?: string;
  focusX?: number;
  label: string;
}) {
  return (
    <View style={{ height }} accessible accessibilityRole="image" accessibilityLabel={label}>
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={{ left: `${focusX * 100}%`, top: '50%' }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[background, `${background}00`]}
        locations={[0, 1]}
        style={[styles.fade, { top: 0, height: height * 0.24 }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[`${background}00`, `${background}B3`, background]}
        locations={[0, 0.55, 1]}
        style={[styles.fade, { bottom: 0, height: height * 0.4 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0 },
});
