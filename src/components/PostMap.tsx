import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { MapBackdrop } from '@/components/MapBackdrop';
import { colors } from '@/theme/tokens';

import { trailPath } from '@/lib/trail';

import type { PostMapProps } from './postMapTypes';

// No app (nativo) ainda sem mapa de ruas no post: o fundo desenhado e o
// trajeto em SVG, no mesmo enquadramento. O site usa PostMap.web.tsx.
export function PostMap({ trail, accent }: PostMapProps) {
  const d = trailPath(trail, 350, 440, 40);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <MapBackdrop fades={false} />
      {d ? (
        <Svg width="100%" height="100%" viewBox="0 0 350 440" style={StyleSheet.absoluteFill}>
          <Path d={d.path} stroke={accent} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={d.start[0]} cy={d.start[1]} r={6} fill={colors.paper} />
          <Circle cx={d.end[0]} cy={d.end[1]} r={8} fill={accent} stroke={colors.ink} strokeWidth={3} />
        </Svg>
      ) : null}
    </View>
  );
}
