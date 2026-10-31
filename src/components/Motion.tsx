import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

// Movimentos do app num lugar só, para tudo andar no mesmo ritmo:
// - Appear: entra subindo e aparecendo (com atraso para listas em sequência)
// - Pressy: botão que afunda de leve ao tocar e volta com mola
// - SlideUp: folha que sobe da base da tela

const native = true; // transform e opacity rodam na thread nativa

export function useEntrance({ delay = 0, distance = 14, duration = 320 }: { delay?: number; distance?: number; duration?: number } = {}) {
  const k = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(k, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [k, delay, duration]);
  return { opacity: k, transform: [{ translateY: k.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] };
}

export function Appear({ children, delay = 0, distance, style }: { children: ReactNode; delay?: number; distance?: number; style?: StyleProp<ViewStyle> }) {
  const a = useEntrance({ delay, distance });
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

// Atraso de cada item numa lista que entra em sequência (para no 8º).
export const stagger = (i: number, step = 45) => Math.min(i, 8) * step;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Pressy({ style, children, scaleTo = 0.96, onPressIn, onPressOut, ...rest }: PressableProps & { scaleTo?: number; style?: StyleProp<ViewStyle> }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, friction: 6, tension: 320, useNativeDriver: native }).start();
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale: s }] }]}>
      {children}
    </AnimatedPressable>
  );
}

export function SlideUp({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const k = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(k, { toValue: 1, friction: 9, tension: 70, useNativeDriver: native }).start();
  }, [k]);
  return <Animated.View style={[style, { transform: [{ translateY: k.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }] }]}>{children}</Animated.View>;
}

// Entra crescendo com mola (títulos grandes, revelações).
export function PopIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const k = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(k, { toValue: 1, friction: 5, tension: 110, delay, useNativeDriver: native }).start();
  }, [k, delay]);
  return (
    <Animated.View style={[style, { opacity: k.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ scale: k.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
      {children}
    </Animated.View>
  );
}
