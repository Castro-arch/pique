import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { BoostSlot, EmptySlot, useFreshBoost, type BoostKind } from '@/components/Boosts';
import { Eye, EyeOff } from '@/components/icons';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

// Placar da partida (tela 13.12): barra no topo com o relógio num meio-círculo
// e o anel do ping em volta. O olho mostra quem te vê; as 2 bolinhas de boost
// ficam no lado oposto do arco. A moldura contorna tudo numa peça só.
// Medidas no espaço de 390 px do design; em celular mais estreito, encolhe junto.

const W = 390;
// No navegador não há barra de status: o placar sobe até perto do topo.
const LIFT = Platform.OS === 'web' ? 32 : 0;
const BAR_TOP = 44;
const BAR_BOTTOM = 150;
const CX = 195;
const CY = BAR_BOTTOM - 20; // centro do relógio
const R = 92; // raio do meio-círculo
const RING = 164; // anel do ping
const FILL = '#111519';
const LINE = colors.inkBorder;

// Bolinhas no mesmo raio do anel: o olho à esquerda e o par de boosts no
// espelho dele, um pouco mais para baixo para não cobrir o texto do ping.
const at = (deg: number) => ({ x: CX + 80 * Math.cos((deg * Math.PI) / 180), y: CY + 80 * Math.sin((deg * Math.PI) / 180) });
const EYE = at(130);
const SLOTS = [at(80), at(47)];
const HALO = 24;
const DOT = 34;

const dx = Math.sqrt(R * R - 20 * 20);
const SHAPE = `M40 ${BAR_TOP} H350 A24 24 0 0 1 374 ${BAR_TOP + 24} V${BAR_BOTTOM - 24} A24 24 0 0 1 350 ${BAR_BOTTOM} H${CX + dx} A${R} ${R} 0 0 1 ${CX - dx} ${BAR_BOTTOM} H40 A24 24 0 0 1 16 ${BAR_BOTTOM - 24} V${BAR_TOP + 24} A24 24 0 0 1 40 ${BAR_TOP} Z`;

export type ArcStatus = 'hidden' | 'team' | 'off';
type Boost = { id: string; kind: BoostKind };

export function ArcHud({
  timeLabel,
  time,
  pingLabel,
  progress,
  free,
  total,
  zone,
  zoneNote,
  status,
  statusLabel,
  boosts,
  onBoost,
}: {
  timeLabel: string;
  time: string;
  pingLabel: string;
  progress: number; // 0 a 1: quanto do intervalo do ping já passou
  free: number;
  total: number;
  zone: string;
  zoneNote: string;
  status: ArcStatus;
  statusLabel: string;
  boosts?: Boost[] | null; // null = sem boosts nesta partida (ou caçador)
  onBoost?: (b: Boost) => void;
}) {
  const { width } = useWindowDimensions();
  const scale = Math.min(1, width / W);
  const fresh = useFreshBoost(boosts ?? []);
  const halos = boosts ? [EYE, ...SLOTS] : [EYE];
  const r = (RING - 7) / 2;
  const c = 2 * Math.PI * r;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { top: -LIFT * scale, left: width > W ? (width - W) / 2 : 0, transform: [{ scale }], transformOrigin: 'top left' }]}>
      <Svg width={W} height={CY + R + HALO} style={StyleSheet.absoluteFill} pointerEvents="none">
        {halos.map((h, i) => (
          <Circle key={`b${i}`} cx={h.x} cy={h.y} r={HALO} fill={FILL} stroke={LINE} strokeWidth={1} />
        ))}
        <Path d={SHAPE} fill={FILL} stroke={LINE} strokeWidth={1} />
        {halos.map((h, i) => (
          <Circle key={`t${i}`} cx={h.x} cy={h.y} r={HALO - 0.5} fill={FILL} />
        ))}
      </Svg>

      <View pointerEvents="none" style={[styles.ring, { left: CX - RING / 2, top: CY - RING / 2 }]}>
        <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
          <Circle cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke={LINE} strokeWidth={7} />
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={r}
            fill="none"
            stroke={colors.lime}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`${c * Math.min(1, Math.max(0, progress))} ${c}`}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        </Svg>
        <Text style={styles.small}>{timeLabel}</Text>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.ping}>{pingLabel}</Text>
      </View>

      <View pointerEvents="none" style={[styles.side, { left: 32 }]}>
        <Text style={styles.small}>Corredores</Text>
        <Text style={styles.value}>
          {free} de {total}
        </Text>
        {total <= 8 ? (
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
            {Array.from({ length: total }, (_, i) => (
              <View key={i} style={i < free ? styles.dotOn : styles.dotOff} />
            ))}
          </View>
        ) : null}
      </View>

      <View pointerEvents="none" style={[styles.side, { right: 32, alignItems: 'flex-end' }]}>
        <Text style={styles.small}>Zona</Text>
        <Text style={styles.value}>{zone}</Text>
        <Text style={[styles.small, { marginTop: 6 }]}>{zoneNote}</Text>
      </View>

      <View
        accessible
        accessibilityLabel={statusLabel}
        style={[styles.dot, { left: EYE.x - DOT / 2, top: EYE.y - DOT / 2 }, status === 'hidden' ? { backgroundColor: colors.lime } : { backgroundColor: colors.inkBorder }]}>
        {status === 'team' ? (
          <Eye size={17} color={colors.paper} strokeWidth={2.2} />
        ) : (
          <EyeOff size={17} color={status === 'hidden' ? colors.limeInk : colors.paperMuted} strokeWidth={2.2} />
        )}
      </View>

      {boosts
        ? SLOTS.map((p, i) => {
            const b = boosts[i];
            return (
              <View key={b?.id ?? `vazio-${i}`} style={{ position: 'absolute', left: p.x - DOT / 2, top: p.y - DOT / 2 }}>
                {b ? <BoostSlot boost={b} pop={b.id === fresh} onPress={() => onBoost?.(b)} size={DOT} /> : <EmptySlot size={DOT} />}
              </View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, width: W, height: CY + R + HALO },
  ring: { position: 'absolute', width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  side: { position: 'absolute', top: 64, width: 84 },
  small: { fontSize: 11, color: colors.paperMuted },
  value: { fontFamily: fonts.display, fontSize: 24, lineHeight: 29, color: colors.paper },
  time: { fontFamily: fonts.display, fontSize: 42, lineHeight: 46, letterSpacing: -1.2, color: colors.paper, fontVariant: ['tabular-nums'] },
  ping: { marginTop: 3, fontSize: 12, fontFamily: fonts.bodyStrong, color: colors.lime },
  dotOn: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime },
  dotOff: { width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderStyle: 'dashed', borderColor: '#55606B' },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
});
