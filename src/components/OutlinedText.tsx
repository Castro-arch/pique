import { View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

// Texto grande com contorno preto e relevo, como as figurinhas (o nome no
// Início, o código no lobby). O contorno são cópias pretas deslocadas em volta,
// que funcionam igual no app e no site. `dot` põe um ponto colorido no fim.
const RING = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-0.7, -0.7],
  [0.7, -0.7],
  [-0.7, 0.7],
  [0.7, 0.7],
];

export function OutlinedText({ text, size, dot, label }: { text: string; size: number; dot?: string; label?: string }) {
  const w = Math.max(3, Math.round(size * 0.055));
  const font = { fontFamily: fonts.display, letterSpacing: -size * 0.03, fontSize: size, lineHeight: size * 1.05 };
  const body = (dotColor?: string) => (
    <>
      {text}
      {dotColor ? <Text style={[font, { color: dotColor }]}>.</Text> : null}
    </>
  );
  const layer = (dx: number, dy: number, key: string) => (
    <Text key={key} aria-hidden numberOfLines={1} selectable={false} style={[font, { color: '#000', position: 'absolute', left: dx, top: dy }]}>
      {body(dot ? '#000' : undefined)}
    </Text>
  );
  return (
    <View accessibilityRole="header" accessibilityLabel={label ?? text} style={{ paddingHorizontal: w + 4, paddingBottom: w + 4 }}>
      <View>
        {/* relevo: uma cópia preta deslocada para baixo e para a direita, com contorno */}
        {RING.map(([x, y], i) => layer(w * 0.9 + x * w, w * 1.3 + y * w, 'r' + i))}
        {layer(w * 0.9, w * 1.3, 'r')}
        {RING.map(([x, y], i) => layer(x * w, y * w, 'c' + i))}
        <Text numberOfLines={1} selectable={false} style={[font, { color: colors.paper }]}>
          {body(dot)}
        </Text>
      </View>
    </View>
  );
}
