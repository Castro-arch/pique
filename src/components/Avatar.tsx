import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts, roleColor, type Role } from '@/theme/tokens';

type State = Role | 'draw' | 'out' | 'warning' | 'neutral';

const ring: Record<State, string> = {
  runner: roleColor.runner,
  hunter: roleColor.hunter,
  draw: colors.inkMuted,
  out: colors.paperMuted,
  warning: colors.amber,
  neutral: colors.ink,
};

// Foto do jogador com anel na cor do papel. Sem foto, mostra a inicial do nome.
// "out" = pego (cinza e tracejado); "draw" = no sorteio (tracejado).
export function Avatar({
  source,
  name,
  size = 36,
  state = 'neutral',
  glow,
  label,
  style,
}: {
  source?: number;
  name?: string;
  size?: number;
  state?: State;
  glow?: boolean;
  label?: string;
  style?: ViewStyle;
}) {
  const dashed = state === 'out' || state === 'draw';
  const border = size >= 72 ? 4 : size >= 30 ? 3 : 2;
  return (
    <View
      accessible={!!label}
      accessibilityLabel={label}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: border,
          borderColor: ring[state],
          borderStyle: dashed ? 'dashed' : 'solid',
          overflow: 'hidden',
          backgroundColor: colors.ink,
          opacity: state === 'out' ? 0.75 : 1,
        },
        glow && {
          shadowColor: ring[state],
          shadowOpacity: 0.6,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        },
        style,
      ]}>
      {source !== undefined ? (
        <Image
          source={source}
          style={[StyleSheet.absoluteFill, state === 'out' && { opacity: 0.6 }]}
          contentFit="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inkRaised }]}>
          <Text style={{ fontFamily: fonts.bodyStrong, fontSize: size * 0.4, color: ring[state] === colors.ink ? colors.paper : ring[state] }}>
            {(name ?? '?').trim().charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}

// Fotos sobrepostas ("+2"), usadas em lobby, convite e cards.
export function AvatarStack({
  sources,
  size = 30,
  ring: ringColor = colors.inkRaised,
  extra,
}: {
  sources: number[];
  size?: number;
  ring?: string;
  extra?: number;
}) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {sources.map((s, i) => (
        <View
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -size * 0.3,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: ringColor,
          }}>
          <Image source={s} style={{ width: size - 4, height: size - 4, borderRadius: size / 2 }} />
        </View>
      ))}
      {extra ? (
        <View
          style={{
            marginLeft: -size * 0.3,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.inkBorder,
            borderWidth: 2,
            borderColor: ringColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong }}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}
