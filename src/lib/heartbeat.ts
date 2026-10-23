import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Vibration } from 'react-native';

// Coração acelerado: tum-tum, pausa. 0,8 s por ciclo (~75 bpm). A vibração e
// o pulso da tela saem do mesmo relógio, então batem juntos.
export const BEAT_MS = 800;
const GAP_MS = 220; // do primeiro tum ao segundo

const native = Platform.OS !== 'web';

// Uma batida dupla no celular. iPhone não deixa escolher a duração da
// vibração, então usa dois impactos fortes do motor háptico.
function vibrateBeat() {
  if (Platform.OS === 'android') {
    Vibration.vibrate([0, 90, GAP_MS - 90, 70]);
  } else if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), GAP_MS);
  } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([90, GAP_MS - 90, 70]); // Chrome no Android; Safari ignora
  }
}

// 0 em repouso, 1 no primeiro tum, 0,75 no segundo.
function pulseOnce(v: Animated.Value) {
  const to = (toValue: number, duration: number, easing = Easing.out(Easing.quad)) =>
    Animated.timing(v, { toValue, duration, easing, useNativeDriver: native });
  return Animated.sequence([to(1, 90), to(0.2, 130), to(0.75, 80), to(0, 260, Easing.in(Easing.quad))]);
}

export function useHeartbeat(on: boolean) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return;
    const beat = () => {
      vibrateBeat();
      pulseOnce(pulse).start();
    };
    beat();
    const t = setInterval(beat, BEAT_MS);
    return () => {
      clearInterval(t);
      Vibration.cancel();
      pulse.setValue(0);
    };
  }, [on, pulse]);
  return pulse;
}
