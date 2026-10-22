import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { Avatar } from '@/components/Avatar';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

import { personState, personTag, type GameMapProps } from './gameMapTypes';

// Mapa da partida no celular: satélite de verdade.
// Android usa Google Maps (precisa da GOOGLE_MAPS_API_KEY no build);
// iPhone usa Apple Maps, sem chave. Decisão do documento de arquitetura.
export function GameMap({ zone, nextZoneRadius, people, now, hunter, outOfZone, dim = 0 }: GameMapProps) {
  const map = useRef<MapView>(null);

  // Enquadra a zona inteira, com folga para o placar em cima e o Radio embaixo.
  useEffect(() => {
    if (!zone) return;
    const d = (zone.radius * 2.6) / 111_320;
    map.current?.animateToRegion(
      { latitude: zone.lat, longitude: zone.lng, latitudeDelta: d, longitudeDelta: d / Math.cos((zone.lat * Math.PI) / 180) },
      400,
    );
  }, [zone?.lat, zone?.lng, zone?.radius]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        mapType="satellite"
        showsUserLocation={false}
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        initialRegion={
          zone
            ? { latitude: zone.lat, longitude: zone.lng, latitudeDelta: (zone.radius * 2.6) / 111_320, longitudeDelta: (zone.radius * 2.6) / 111_320 }
            : undefined
        }>
        {zone ? (
          <Circle
            center={{ latitude: zone.lat, longitude: zone.lng }}
            radius={zone.radius}
            strokeColor={nextZoneRadius ? 'rgba(243,240,232,0.55)' : 'rgba(200,242,60,0.85)'}
            fillColor={nextZoneRadius ? 'rgba(255,176,32,0.16)' : 'rgba(200,242,60,0.06)'}
            strokeWidth={2}
            lineDashPattern={[8, 6]}
          />
        ) : null}
        {zone && nextZoneRadius ? (
          <Circle
            center={{ latitude: zone.lat, longitude: zone.lng }}
            radius={nextZoneRadius}
            strokeColor={colors.lime}
            fillColor="rgba(200,242,60,0.08)"
            strokeWidth={2.5}
            lineDashPattern={[10, 6]}
          />
        ) : null}
        {people.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            anchor={{ x: 0.12, y: 0.5 }}
            tracksViewChanges={p.kind === 'ping'}
            zIndex={p.isMe ? 10 : 1}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Avatar name={p.name} size={p.isMe ? 46 : 36} state={personState(p, outOfZone)} glow={p.isMe} />
              <View style={[styles.tag, p.isMe && { backgroundColor: hunter ? colors.pink : colors.lime }]}>
                <Text
                  style={{
                    fontSize: p.isMe ? 12 : 11,
                    fontFamily: fonts.bodyStrong,
                    color: p.isMe ? (hunter ? colors.pinkInk : colors.limeInk) : colors.paper,
                  }}>
                  {personTag(p, now)}
                </Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>
      {/* Degradês leves em cima e embaixo, como no design, para o placar e o Radio lerem bem. */}
      <LinearGradient pointerEvents="none" colors={['rgba(11,14,17,0.55)', 'rgba(11,14,17,0)']} style={[styles.fade, { top: 0, height: 240 }]} />
      <LinearGradient pointerEvents="none" colors={['rgba(11,14,17,0)', 'rgba(11,14,17,0.6)']} style={[styles.fade, { bottom: 0, height: 320 }]} />
      {dim > 0 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(11,14,17,${dim})` }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: 'rgba(26,32,39,0.92)' },
  fade: { position: 'absolute', left: 0, right: 0 },
});
