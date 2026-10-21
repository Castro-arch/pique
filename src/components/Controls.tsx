import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme/tokens';

// Interruptor liga/desliga no visual do design (verde quando ligado).
export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange?: (v: boolean) => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange?.(!value)}
      hitSlop={8}
      style={[styles.track, { backgroundColor: value ? colors.lime : colors.inkBorder }]}>
      <View
        style={[
          styles.thumb,
          value
            ? { right: 3, backgroundColor: colors.limeInk }
            : { left: 3, backgroundColor: colors.paperMuted },
        ]}
      />
    </Pressable>
  );
}

// Contador − valor + das regras da partida.
export function Stepper({
  value,
  onMinus,
  onPlus,
  label,
}: {
  value: string;
  onMinus?: () => void;
  onPlus?: () => void;
  label: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Diminuir ${label}`} onPress={onMinus} style={styles.stepBtn}>
        <Text style={styles.stepSign}>−</Text>
      </Pressable>
      <Text variant="number" style={styles.stepValue}>
        {value}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Aumentar ${label}`} onPress={onPlus} style={styles.stepBtn}>
        <Text style={styles.stepSign}>+</Text>
      </Pressable>
    </View>
  );
}

// Seletor de uma opção entre poucas (Fácil / Normal / Difícil).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; icon?: React.ReactNode; active?: { bg: string; fg: string } }[];
  value: T;
  onChange?: (v: T) => void;
  style?: ViewStyle;
}) {
  return (
    <View accessibilityRole="radiogroup" style={[styles.seg, style]}>
      {options.map((o) => {
        const on = o.value === value;
        const act = o.active ?? { bg: colors.inkBorder, fg: colors.paper };
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.label}
            onPress={() => onChange?.(o.value)}
            style={[styles.segItem, on && { backgroundColor: act.bg }]}>
            {o.icon}
            <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14, color: on ? act.fg : colors.paper }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Barras de passo no topo (Como jogar, cadastro).
export function StepBars({ total, current }: { total: number; current: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Passo ${current} de ${total}`}
      style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            backgroundColor: i < current ? colors.lime : colors.inkBorder,
          }}
        />
      ))}
    </View>
  );
}

// Barra de progresso fina (tempo até o ping, corredores restantes).
export function ProgressBar({
  value,
  color = colors.lime,
  height = 6,
}: {
  value: number; // 0..1
  color?: string;
  height?: number;
}) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: colors.inkBorder, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: 46, height: 28, borderRadius: 14 },
  thumb: { position: 'absolute', top: 3, width: 22, height: 22, borderRadius: 11 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.md,
    height: 44,
  },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 20, color: colors.paper },
  stepValue: { minWidth: 64, textAlign: 'center', fontSize: 17 },
  seg: {
    flexDirection: 'row',
    backgroundColor: colors.inkRaised,
    borderRadius: 18,
    padding: 4,
    gap: 4,
  },
  segItem: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});
