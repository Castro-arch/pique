import { router } from 'expo-router';
import { ChevronLeft, X } from '@/components/icons';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts, touch } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

// "< Voltar" em verde, no canto superior esquerdo.
export function BackButton({ label = 'Voltar', onPress }: { label?: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress ?? goBack}
      hitSlop={8}
      style={styles.back}>
      <ChevronLeft size={20} color={colors.lime} strokeWidth={2.4} />
      <Text style={{ color: colors.lime, fontFamily: fonts.bodyMedium, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function CloseButton({ onPress, label = 'Fechar' }: { onPress?: () => void; label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress ?? goBack}
      hitSlop={8}
      style={styles.icon}>
      <X size={22} color={colors.paper} strokeWidth={2.2} />
    </Pressable>
  );
}

// Linha do topo: algo à esquerda, título opcional no meio, algo à direita.
export function TopBar({ left, title, right }: { left?: ReactNode; title?: string; right?: ReactNode }) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>{left}</View>
      {title ? (
        <Text variant="h3" style={{ fontSize: 18 }}>
          {title}
        </Text>
      ) : null}
      <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

// Logo "● pique".
const MARK = require('../../assets/images/logo-mark.png');
// Mesma marca com o quadrado preto e o boneco verde, para fundos verdes.
const MARK_INK = require('../../assets/images/logo-mark-ink.png');

// A marca: o ícone do app (bonequinho correndo) + "pique". Em fundo verde
// (dot de outra cor) o ícone sumiria, então fica a bolinha de antes.
export function Logo({ size = 24, color = colors.paper, dot = colors.lime, ink }: { size?: number; color?: string; dot?: string; ink?: boolean }) {
  return (
    <View accessibilityLabel="Pique" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {dot === colors.lime ? (
        <Image source={ink ? MARK_INK : MARK} style={{ width: size * 1.15, height: size * 1.15 }} accessibilityIgnoresInvertColors />
      ) : (
        <View style={{ width: size * 0.58, height: size * 0.58, borderRadius: size, backgroundColor: dot }} />
      )}
      <Text style={{ fontFamily: fonts.display, fontSize: size, letterSpacing: -0.7, color }}>pique</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { height: touch, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  icon: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  bar: { height: touch, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { minWidth: 60 },
});
