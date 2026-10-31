import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Pressy } from '@/components/Motion';
import { Text } from '@/components/Text';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts } from '@/theme/tokens';

// Linha 20 do design: blocos escuros de tamanhos diferentes, cartão de
// destaque inclinado em degradê e figurinhas (ícones grossos com contorno
// preto e um "relevo" deslocado). Usado no Início, Loja, Perfil e Crew.

export const BENTO = { ink: '#0B0F13', tile: '#141A21', line: '#222A33', muted: '#8B949C' };

// ---------- Figurinhas ----------
const K = '#0B0F13';
const sw = { stroke: K, strokeWidth: 3.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
export type StickerKind = 'hand' | 'run' | 'chat' | 'crew' | 'pin' | 'bag' | 'cup' | 'ghost' | 'qr';

function Shape({ kind, color }: { kind: StickerKind; color: string }) {
  switch (kind) {
    case 'hand':
      return (
        <>
          <Path d="M18 30V16a4 4 0 0 1 8 0v10V11a4 4 0 0 1 8 0v15V13a4 4 0 0 1 8 0v16-9a4 4 0 0 1 8 0v18c0 12-8 20-19 20h-2c-7 0-11-3-15-8l-7-9a4 4 0 0 1 6-5l5 5z" fill={color} {...sw} />
          <Path d="M26 34h16" fill="none" {...sw} />
        </>
      );
    case 'run':
      return (
        <>
          <Rect x={4} y={4} width={56} height={56} rx={16} fill={color} {...sw} />
          <Circle cx={38} cy={17} r={5} fill={K} />
          <Path d="M20 27l9-5 9 5 6-3M29 22l-5 13 9 5-3 12M24 35l-9 9M15 24h6M12 30h5" fill="none" {...sw} strokeWidth={4.4} />
        </>
      );
    case 'chat':
      return (
        <>
          <Path d="M10 14h44a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H30l-12 10v-10h-8a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" fill={color} {...sw} />
          <Circle cx={22} cy={30} r={3} fill={K} />
          <Circle cx={32} cy={30} r={3} fill={K} />
          <Circle cx={42} cy={30} r={3} fill={K} />
        </>
      );
    case 'crew':
      return (
        <>
          <Circle cx={22} cy={22} r={9} fill={color} {...sw} />
          <Path d="M6 52c0-10 7-16 16-16s16 6 16 16z" fill={color} {...sw} />
          <Circle cx={44} cy={20} r={7} fill="#F3F0E8" {...sw} />
          <Path d="M36 34c8-2 20 2 20 16H40" fill="#F3F0E8" {...sw} />
        </>
      );
    case 'pin':
      return (
        <>
          <Path d="M32 58S12 38 12 24a20 20 0 0 1 40 0c0 14-20 34-20 34z" fill={color} {...sw} />
          <Circle cx={32} cy={24} r={7} fill="#F3F0E8" {...sw} />
        </>
      );
    case 'bag':
      return (
        <>
          <Path d="M12 22h40l-4 34H16z" fill={color} {...sw} />
          <Path d="M22 22v-4a10 10 0 0 1 20 0v4" fill="none" {...sw} />
          <Path d="M24 36l6 6 10-12" fill="none" {...sw} stroke="#F3F0E8" strokeWidth={4} />
        </>
      );
    case 'cup':
      return (
        <>
          <Path d="M18 8h28v14a14 14 0 0 1-28 0z" fill={color} {...sw} />
          <Path d="M18 14H8c0 8 4 12 10 12M46 14h10c0 8-4 12-10 12" fill="none" {...sw} />
          <Path d="M28 36h8v10h-8zM20 56h24v-8H20z" fill={color} {...sw} />
        </>
      );
    case 'ghost':
      return (
        <>
          <Path d="M14 54V28a18 18 0 0 1 36 0v26l-6-5-6 5-6-5-6 5-6-5z" fill={color} {...sw} />
          <Circle cx={26} cy={28} r={3.5} fill={K} />
          <Circle cx={38} cy={28} r={3.5} fill={K} />
        </>
      );
    case 'qr':
      return (
        <>
          <Rect x={8} y={8} width={48} height={48} rx={10} fill={color} {...sw} />
          <Rect x={16} y={16} width={12} height={12} rx={2} fill={K} />
          <Rect x={36} y={16} width={12} height={12} rx={2} fill={K} />
          <Rect x={16} y={36} width={12} height={12} rx={2} fill={K} />
          <Path d="M38 38h4v4h-4zM44 44h4v4h-4z" fill={K} stroke={K} strokeWidth={2} />
        </>
      );
  }
}

// Figurinha com o "relevo" preto deslocado (sombra dura), levemente girada.
export function Sticker({ kind, color = colors.lime, size = 56, tilt = -8 }: { kind: StickerKind; color?: string; size?: number; tilt?: number }) {
  return (
    <View style={{ width: size, height: size, transform: [{ rotate: `${tilt}deg` }] }} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 64 64" style={[StyleSheet.absoluteFill, { transform: [{ translateX: size * 0.05 }, { translateY: size * 0.065 }] }]}>
        <Shape kind={kind} color={K} />
      </Svg>
      <Svg width={size} height={size} viewBox="0 0 64 64" style={StyleSheet.absoluteFill}>
        <Shape kind={kind} color={color} />
      </Svg>
    </View>
  );
}

// ---------- Blocos ----------
export function Tile({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress)
    return (
      <Pressy scaleTo={0.97} onPress={onPress} style={[styles.tile, style]}>
        {children}
      </Pressy>
    );
  return <View style={[styles.tile, style]}>{children}</View>;
}

export function TileHead({ title, sub, subColor = colors.lime }: { title: string; sub?: string; subColor?: string }) {
  return (
    <View>
      <Text style={styles.tileTitle}>{title}</Text>
      {sub ? <Text style={[styles.tileSub, { color: subColor }]}>{sub}</Text> : null}
    </View>
  );
}

// Pílula com seta (escura ou colorida).
export function ArrowPill({ label, onPress, bg = BENTO.ink, fg = colors.paper }: { label: string; onPress?: () => void; bg?: string; fg?: string }) {
  return (
    <Pressy accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={!onPress} style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong, color: fg }}>{label}</Text>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path d="M5 12h14M13 6l6 6-6 6" stroke={fg} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </Pressy>
  );
}

// Cartão de destaque inclinado com degradê; a figurinha fica por cima, fora do cartão.
export function Hero({ from, to, children, sticker, height = 178, tilt = -3 }: { from: string; to: string; children: ReactNode; sticker?: ReactNode; height?: number; tilt?: number }) {
  return (
    <View style={{ height, marginTop: 12 }}>
      <View style={[StyleSheet.absoluteFill, styles.heroShadow, { transform: [{ rotate: `${tilt - 0.5}deg` }, { translateX: 4 }, { translateY: 8 }] }]} />
      <View style={[StyleSheet.absoluteFill, styles.hero, { transform: [{ rotate: `${tilt}deg` }] }]}>
        <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.blob, { right: -40, bottom: -60, width: 220, height: 220, backgroundColor: 'rgba(255,255,255,0.18)' }]} />
        <View style={[styles.blob, { left: -30, bottom: -80, width: 180, height: 180, backgroundColor: 'rgba(11,15,19,0.08)' }]} />
        <View style={{ flex: 1, padding: 18, paddingBottom: 16, transform: [{ rotate: `${-tilt}deg` }] }}>{children}</View>
      </View>
      {sticker}
    </View>
  );
}

// Barra de baixo das telas da conta (Início, Loja, Crew, Perfil).
type Tab = { path: '/' | '/loja' | '/crew' | '/perfil'; label: string; icon: (c: string, fill: string) => ReactNode };
const TABS: Tab[] = [
  { path: '/', label: 'Início', icon: (c, f) => <Path d="M4 11l8-7 8 7v9H4z" stroke={c} fill={f} strokeWidth={2} strokeLinejoin="round" /> },
  {
    path: '/crew',
    label: 'Crew',
    icon: (c, f) => (
      <>
        <Circle cx={9} cy={8} r={3.5} stroke={c} fill={f} strokeWidth={2} />
        <Path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6zM16 5.5a3 3 0 1 1 0 6M17 14c2.5.5 4 2.6 4 6h-3" stroke={c} fill="none" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  {
    path: '/loja',
    label: 'Loja',
    icon: (c, f) => (
      <>
        <Path d="M5 8h14l-1.5 12h-11z" stroke={c} fill={f} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M9 8V7a3 3 0 0 1 6 0v1" stroke={c} fill="none" strokeWidth={2} />
      </>
    ),
  },
  {
    path: '/perfil',
    label: 'Perfil',
    icon: (c, f) => (
      <>
        <Circle cx={12} cy={8} r={4} stroke={c} fill={f} strokeWidth={2} />
        <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6z" stroke={c} fill={f} strokeWidth={2} strokeLinejoin="round" />
      </>
    ),
  },
];

export const NAV_SPACE = 96;

export function BottomNav() {
  const path = usePathname();
  const insets = useScreenInsets();
  return (
    <View style={[styles.nav, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
      {TABS.map((t) => {
        const on = path === t.path;
        return (
          <Pressable
            key={t.path}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t.label}
            onPress={() => !on && router.replace(t.path)}
            style={[styles.navItem, on && styles.navOn]}>
            <Svg width={22} height={22} viewBox="0 0 24 24">
              {t.icon(on ? BENTO.ink : '#55606B', on ? BENTO.ink : 'none')}
            </Svg>
          </Pressable>
        );
      })}
    </View>
  );
}

// Fundo da tela: escuro com um brilho colorido no canto.
export function BentoBackground({ glow = 'rgba(200,242,60,0.14)' }: { glow?: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BENTO.ink }]} />
      <LinearGradient colors={[glow, 'rgba(0,0,0,0)']} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: BENTO.tile, borderWidth: 1, borderColor: BENTO.line, borderRadius: 24, padding: 14, overflow: 'hidden' },
  tileTitle: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.2, color: colors.paper },
  tileSub: { fontSize: 12, fontFamily: fonts.bodyStrong, marginTop: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
  hero: { borderRadius: 28, overflow: 'hidden' },
  heroShadow: { borderRadius: 28, backgroundColor: BENTO.ink, opacity: 0.6 },
  blob: { position: 'absolute', borderRadius: 999 },
  nav: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 64,
    borderRadius: 24,
    backgroundColor: '#12171D',
    borderWidth: 1,
    borderColor: BENTO.line,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: { width: 56, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  navOn: { backgroundColor: colors.lime, boxShadow: '0 0 18px rgba(200,242,60,0.45)' },
});
