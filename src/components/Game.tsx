import { router, useLocalSearchParams } from 'expo-router';
import { Ellipsis } from '@/components/icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { MapPin } from '@/components/MapBackdrop';
import { Text } from '@/components/Text';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts, radius } from '@/theme/tokens';

// Peças compartilhadas pelas telas de mapa da partida.

// Relógio regressivo em mm:ss. Para em zero.
export function useCountdown(start: number) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    setLeft(start);
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [start]);
  return left;
}

export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Cartão escuro do topo: tempo grande, ping à direita e o que vier embaixo.
export function Hud({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.hud, style]}>{children}</View>;
}

export function HudClock({
  label,
  value,
  color = colors.paper,
  sideLabel,
  sideValue,
  sideColor = colors.paper,
  progress,
}: {
  label: string;
  value: string;
  color?: string;
  sideLabel: string;
  sideValue: string;
  sideColor?: string;
  progress?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <View>
        <Text variant="label">{label}</Text>
        <Text style={[styles.big, { color }]} accessibilityLabel={`${label} ${value}`}>{value}</Text>
      </View>
      <View style={{ width: 132, alignItems: 'flex-end' }}>
        <Text variant="label">{sideLabel}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: sideColor }}>{sideValue}</Text>
        <Bar value={progress ?? 0} color={sideColor === colors.paper ? colors.lime : sideColor} style={{ alignSelf: 'stretch', marginTop: 4 }} />
      </View>
    </View>
  );
}

export function Bar({ value, color = colors.lime, track = colors.inkBorder, style }: { value: number; color?: string; track?: string; style?: ViewStyle }) {
  return (
    <View style={[{ height: 6, borderRadius: 3, backgroundColor: track, overflow: 'hidden' }, style]}>
      <View style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

export function HudRunners({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.runners}>
      <Text variant="label">Corredores</Text>
      <Bar value={value} color={colors.paper} style={{ flex: 1 }} />
      <Text style={{ fontFamily: fonts.display, fontSize: 16 }}>{label}</Text>
    </View>
  );
}

export function HudFoot({ badge, badgeTone = 'neutral', icon, right }: { badge: string; badgeTone?: 'neutral' | 'runner'; icon?: ReactNode; right: string }) {
  const runner = badgeTone === 'runner';
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
      <View style={[styles.badge, { backgroundColor: runner ? colors.limeTint : colors.inkBorder }]}>
        {icon}
        <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, color: runner ? colors.lime : colors.paper }}>{badge}</Text>
      </View>
      <Text variant="label">{right}</Text>
    </View>
  );
}

// Legenda pequena logo abaixo do cartão do topo.
export function Legend({ items, top = 230 }: { items: { label: string; mark: ReactNode }[]; top?: number }) {
  return (
    <View style={[styles.legend, { top }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {items.map((i) => (
        <View key={i.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {i.mark}
          <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong }}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

export const marks = {
  runner: <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.lime }} />,
  hunter: <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2.5, borderColor: colors.pink }} />,
  out: <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.paperMuted }} />,
  newZone: <View style={{ width: 12, height: 2, backgroundColor: colors.lime }} />,
  leaving: <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: 'rgba(255,176,32,0.5)' }} />,
};

// Cartão de baixo: última mensagem do Radio e a ação do momento.
// Onde ficam as abas (dock) e o cartão de baixo (card). No app, o espaço do
// indicador de início é fixo; no navegador vale a área segura de verdade (no
// iPhone o Safari desenha a página por baixo das bordas da tela).
export function useDock() {
  const insets = useScreenInsets();
  if (Platform.OS !== 'web') return { dock: 34, card: 106 };
  const dock = insets.bottom + 16;
  return { dock, card: dock + 70 };
}

export function RadioCard({ from, fromRole, text, children }: { from: string; fromRole?: 'hunter' | 'radio'; text: string; children?: ReactNode }) {
  const hunter = fromRole === 'hunter';
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { card } = useDock();
  return (
    <View style={[styles.radio, { bottom: card }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${from}: ${text}. Abrir Radio`}
        onPress={() => router.push({ pathname: '/radio', params: id ? { id } : {} })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[styles.radioIcon, hunter ? { borderWidth: 3, borderColor: colors.pink, backgroundColor: colors.ink } : { borderWidth: 1.5, borderColor: colors.lime }]}>
          <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: hunter ? colors.pink : colors.lime }}>{from[0]}</Text>
        </View>
        <Text numberOfLines={2} style={{ flex: 1, fontSize: 14, lineHeight: 19 }}>
          <Text style={{ color: colors.paperMuted, fontSize: 14 }}>{from}</Text> · {text}
        </Text>
      </Pressable>
      {children}
    </View>
  );
}

// Botão largo dentro do cartão de baixo ("Fui pego", "Marquei um corredor").
export function CardAction({
  label,
  hint,
  tone = 'dark',
  onPress,
  style,
}: {
  label: string;
  hint?: string;
  tone?: 'dark' | 'lime' | 'amber' | 'pink';
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const bg = tone === 'lime' ? colors.lime : tone === 'amber' ? colors.amber : tone === 'pink' ? colors.pink : colors.ink;
  const fg = tone === 'lime' ? colors.limeInk : tone === 'amber' ? colors.amberInk : colors.paper;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { backgroundColor: bg }, tone === 'dark' && { borderWidth: 1, borderColor: colors.inkBorder }, style, pressed && { opacity: 0.85 }]}>
      <Text style={{ fontSize: 15, fontFamily: fonts.bodyStrong, color: fg }}>
        {label}
        {hint ? <Text style={{ fontSize: 15, color: tone === 'dark' ? colors.paperMuted : fg }}> · {hint}</Text> : null}
      </Text>
    </Pressable>
  );
}

// Abas Mapa / Radio e o botão de mais opções, presos na base.
export function GameTabs({
  unread,
  tab = 'mapa',
  bottom,
  onMap,
  onRadio,
}: {
  unread?: number;
  tab?: 'mapa' | 'radio';
  bottom?: number;
  onMap?: () => void; // Radio aberto por cima do mapa: fecha o painel
  onRadio?: () => void; // mapa da partida: abre o painel do Radio
}) {
  const { dock } = useDock();
  // No treino com bots (?treino=1) o menu ganha os controles extras.
  // Na partida real (?id=) Radio e menu levam o id junto.
  const { treino, id } = useLocalSearchParams<{ treino?: string; id?: string }>();
  const extra = id ? { id } : treino === '1' ? { treino } : {};
  return (
    <View style={[styles.tabsRow, { bottom: bottom ?? dock }]}>
      <View accessibilityRole="tablist" style={styles.tabs}>
        <Tab
          label="Mapa"
          on={tab === 'mapa'}
          onPress={() => {
            if (tab === 'mapa') return;
            if (onMap) return onMap();
            // Depois de recarregar a página não há para onde voltar: abre o mapa da partida.
            if (router.canGoBack()) router.back();
            else router.replace(id ? { pathname: '/jogo', params: { id } } : '/jogo');
          }}
        />
        <Tab
          label="Radio"
          on={tab === 'radio'}
          unread={unread}
          onPress={() => {
            if (tab === 'radio') return;
            if (onRadio) return onRadio();
            router.push({ pathname: '/radio', params: id ? { id } : {} });
          }}
        />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Mais opções" onPress={() => router.push({ pathname: '/menu', params: extra })} style={styles.more}>
        <Ellipsis size={22} color={colors.paper} />
      </Pressable>
    </View>
  );
}

function Tab({ label, on, unread, onPress }: { label: string; on: boolean; unread?: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={unread ? `${label}, ${unread} novas` : label}
      onPress={onPress}
      style={[styles.tab, on && { backgroundColor: colors.lime }]}>
      <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong, color: on ? colors.limeInk : colors.paper }}>{label}</Text>
      {unread ? (
        <View style={styles.unread}>
          <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: colors.pinkInk }}>{unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// Pessoa no mapa: foto com anel da cor do papel e etiqueta ao lado.
export function Person({
  x,
  y,
  photo,
  state,
  tag,
  me,
  tagTone,
}: {
  x: number;
  y: number;
  photo: number;
  state: 'runner' | 'hunter' | 'out' | 'warning';
  tag?: string;
  me?: boolean;
  tagTone?: 'solid' | 'muted';
}) {
  const size = me ? 46 : 36;
  const accent = state === 'runner' ? colors.lime : state === 'hunter' ? colors.pink : state === 'warning' ? colors.amber : colors.paperMuted;
  const ink = state === 'runner' ? colors.limeInk : state === 'hunter' ? colors.pinkInk : colors.amberInk;
  const solid = me || tagTone === 'solid';
  return (
    <MapPin x={x} y={y}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Avatar source={photo} size={size} state={state} glow={me} />
        {tag ? (
          <View style={[styles.tag, solid ? { backgroundColor: accent } : { backgroundColor: colors.inkRaised }]}>
            <Text
              style={{
                fontSize: me ? 12 : 11,
                fontFamily: fonts.bodyStrong,
                color: solid ? ink : state === 'hunter' ? colors.pink : state === 'out' ? colors.paperMuted : colors.paper,
              }}>
              {tag}
            </Text>
          </View>
        ) : null}
      </View>
    </MapPin>
  );
}

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 52,
    backgroundColor: 'rgba(16,20,24,0.95)',
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  big: { fontFamily: fonts.display, fontSize: 46, lineHeight: 48, letterSpacing: -1.4 },
  runners: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.inkBorder },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  legend: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    gap: 14,
    backgroundColor: 'rgba(16,20,24,0.92)',
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  radio: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(26,32,39,0.96)',
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.xl,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  radioIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inkRaised },
  action: { marginTop: 10, height: 50, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  tabsRow: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 10, alignItems: 'center' },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    padding: 5,
    backgroundColor: 'rgba(26,32,39,0.96)',
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: 28,
  },
  tab: { flex: 1, height: 46, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  unread: { backgroundColor: colors.pink, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  more: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(26,32,39,0.96)',
    borderWidth: 1,
    borderColor: colors.inkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
});
