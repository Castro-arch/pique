import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Mask, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

// Mapa de fundo desenhado no próprio app: mata escura, curvas de nível e trilhas.
// Serve para as telas de demonstração e o navegador. No celular, o jogo de verdade
// usa Google Maps (Android) e Apple Maps (iPhone) em modo satélite (GameMap, fase 2).
//
// Coordenadas no espaço 390 x 844 do design; o desenho cobre a tela toda.
export type Zone = { cx: number; cy: number; r: number };

export function MapBackdrop({
  zone,
  shrinkTo,
  children,
  dim = 0,
  fades = true,
  grayscale,
}: {
  zone?: Zone;
  shrinkTo?: number; // raio da nova zona quando ela vai encolher
  children?: ReactNode;
  dim?: number; // 0..1, véu escuro extra
  fades?: boolean; // degradês leves no topo e na base
  grayscale?: boolean; // "sem sinal"
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}>
        <Rect width="390" height="844" fill={grayscale ? '#1B1F22' : '#14201A'} />
        {/* manchas de mata e clareiras */}
        <Path d="M-20 90 C60 40 140 120 220 70 S360 60 420 110 V300 C330 260 240 330 150 290 S20 320 -20 280Z" fill={grayscale ? '#202528' : '#18271D'} />
        <Path d="M-20 520 C70 480 150 560 250 510 S380 520 420 560 V880 H-20Z" fill={grayscale ? '#1E2326' : '#172419'} />
        <Path d="M120 360 C150 330 230 340 250 380 S220 450 170 440 S100 400 120 360Z" fill={grayscale ? '#262A2C' : '#2A3320'} opacity={0.7} />
        {/* curvas de nível */}
        {[60, 95, 130, 165, 200, 240].map((r, i) => (
          <Path
            key={r}
            d={`M${195 - r * 1.1} ${430 + i * 3} C${195 - r} ${430 - r * 0.9} ${195 + r} ${430 - r * 0.8} ${195 + r * 1.05} ${430 + i * 4} S${195 - r * 0.4} ${430 + r * 1.1} ${195 - r * 1.1} ${430 + i * 3}Z`}
            stroke="#E8EBE0"
            strokeOpacity={i % 3 === 2 ? 0.42 : 0.2}
            strokeWidth={i % 3 === 2 ? 1.4 : 1}
            fill="none"
          />
        ))}
        <Path d="M20 160 C80 120 120 200 60 230 S-10 190 20 160Z" stroke="#E8EBE0" strokeOpacity={0.22} fill="none" />
        <Path d="M300 640 C350 600 400 660 360 700 S270 690 300 640Z" stroke="#E8EBE0" strokeOpacity={0.22} fill="none" />
        {/* trilhas */}
        <Path d="M-10 610 C80 590 160 640 230 600 S350 560 400 580" stroke="#3A4636" strokeWidth={5} fill="none" strokeLinecap="round" />
        <Path d="M90 -10 C110 140 70 260 120 380 S140 700 110 860" stroke="#3A4636" strokeWidth={4} fill="none" strokeLinecap="round" />

        {zone ? (
          <>
            {shrinkTo ? (
              <>
                <Defs>
                  <Mask id="ring">
                    <Rect width="390" height="844" fill="white" />
                    <Circle cx={zone.cx} cy={zone.cy} r={shrinkTo} fill="black" />
                  </Mask>
                </Defs>
                <Circle cx={zone.cx} cy={zone.cy} r={zone.r} fill={colors.amber} fillOpacity={0.16} mask="url(#ring)" />
                <Circle cx={zone.cx} cy={zone.cy} r={zone.r} stroke={colors.paper} strokeOpacity={0.5} strokeDasharray="4 6" strokeWidth={1.5} fill="none" />
                <Circle cx={zone.cx} cy={zone.cy} r={shrinkTo} stroke={colors.lime} strokeDasharray="8 6" strokeWidth={2.5} fill={colors.lime} fillOpacity={0.06} />
              </>
            ) : (
              <Circle
                cx={zone.cx}
                cy={zone.cy}
                r={zone.r}
                stroke={colors.lime}
                strokeOpacity={0.75}
                strokeDasharray="7 6"
                strokeWidth={2}
                fill={colors.lime}
                fillOpacity={0.05}
              />
            )}
          </>
        ) : null}
      </Svg>

      {dim > 0 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(11,14,17,${dim})` }]} /> : null}
      {fades ? (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(11,14,17,0.55)', 'rgba(11,14,17,0)']}
            style={[styles.fade, { top: 0, height: 240 }]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(11,14,17,0)', 'rgba(11,14,17,0.6)']}
            style={[styles.fade, { bottom: 0, height: 320 }]}
          />
        </>
      ) : null}
      {children}
    </View>
  );
}

// Coloca algo (avatar, etiqueta) num ponto do mapa, em coordenadas do design.
export function MapPin({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: `${(x / 390) * 100}%`, top: `${(y / 844) * 100}%` }}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0 },
});

export { colors as mapColors };
