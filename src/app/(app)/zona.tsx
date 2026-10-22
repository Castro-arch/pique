import { router } from 'expo-router';
import { LocateFixed } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapBackdrop } from '@/components/MapBackdrop';
import { Text } from '@/components/Text';
import { match } from '@/lib/demo';
import { colors, fonts } from '@/theme/tokens';

const STEP = 30;
const MIN = 150;
const MAX = 900;

// 5.7 Zona de jogo: o anfitrião ajusta o tamanho e arrasta o mapa.
// No celular, este mapa vira o GameMap (satélite) na fase do jogo real.
export default function Zona() {
  const insets = useSafeAreaInsets();
  const [meters, setMeters] = useState<number>(match.rules.zoneMeters);
  const suggested = meters === match.rules.zoneMeters;
  // 420 m ≈ raio de 150 no desenho; o círculo cresce junto com os metros.
  const r = (meters / 420) * 150;

  return (
    <View style={{ flex: 1, backgroundColor: colors.inkSunken }}>
      <MapBackdrop zone={{ cx: 195, cy: 420, r }} />
      <View style={[styles.bar, { paddingTop: insets.top }]}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.barBtn}>
          <Text variant="muted" style={{ fontFamily: fonts.bodyMedium }}>Cancelar</Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4 }}>Zona de jogo</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.barBtn}>
          <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 15 }}>Concluir</Text>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Centralizar na minha posição" style={[styles.locate, { top: insets.top + 60 }]}>
        <LocateFixed size={22} color={colors.lime} />
      </Pressable>

      <View style={[styles.panel, { bottom: Math.max(insets.bottom, 34) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4 }}>Tamanho da zona</Text>
            <Text style={{ fontSize: 13, marginTop: 2, color: suggested ? colors.lime : colors.paperMuted, fontFamily: suggested ? fonts.bodyStrong : fonts.body }}>
              {suggested ? 'Sugerido para 6 pessoas' : `Sugerido: ${match.rules.zoneMeters} m`}
            </Text>
          </View>
          <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.display, fontSize: 30 }}>{meters} m</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Diminuir zona" onPress={() => setMeters((m) => Math.max(MIN, m - STEP))} style={styles.step}>
            <Text style={{ fontSize: 24 }}>−</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Aumentar zona" onPress={() => setMeters((m) => Math.min(MAX, m + STEP))} style={styles.step}>
            <Text style={{ fontSize: 24 }}>+</Text>
          </Pressable>
        </View>
        <Text variant="small" style={{ marginTop: 12 }}>Arraste o mapa para mover a zona. Os corredores precisam ficar dentro dela.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.inkBorder,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barBtn: { height: 44, justifyContent: 'center' },
  locate: {
    position: 'absolute',
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: 'rgba(26,32,39,0.97)',
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: 28,
    padding: 18,
  },
  step: { flex: 1, height: 48, borderRadius: 16, backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.inkBorder, alignItems: 'center', justifyContent: 'center' },
});
