import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, Polygon, Polyline } from 'react-native-maps';

import { Avatar } from '@/components/Avatar';
import { BoostPin } from '@/components/Boosts';
import { FARO, FaroRing } from '@/components/MapPins';
import { BEAM, SPOT, beamOutline, zoneOutline } from '@/lib/mapStyle';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

import { personState, personTag, type GameMapProps } from './gameMapTypes';

// Mapa da partida no celular: satélite de verdade.
// Android usa Google Maps (precisa da GOOGLE_MAPS_API_KEY no build);
// iPhone usa Apple Maps, sem chave. Decisão do documento de arquitetura.
const coords = (pts: [number, number][]) => pts.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));

export function GameMap({ zone, nextZoneRadius, people, now, hunter, outOfZone, dim = 0, boosts = [], spot = null, beams = [], draft = null, onPress, frame = null }: GameMapProps) {
  const map = useRef<MapView>(null);
  const fitTo = zone ?? frame;
  // Zona desenhada vira polígono; a de sempre continua círculo.
  const drawn = !!zone?.shape?.length;

  // Enquadra a zona inteira, com folga para o placar em cima e o Radio embaixo.
  useEffect(() => {
    if (!fitTo) return;
    const d = (fitTo.radius * 2.6) / 111_320;
    map.current?.animateToRegion(
      { latitude: fitTo.lat, longitude: fitTo.lng, latitudeDelta: d, longitudeDelta: d / Math.cos((fitTo.lat * Math.PI) / 180) },
      400,
    );
  }, [fitTo?.lat, fitTo?.lng, fitTo?.radius, fitTo?.shape]); // eslint-disable-line react-hooks/exhaustive-deps

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
        onPress={onPress ? (e) => onPress({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude }) : undefined}
        initialRegion={
          fitTo
            ? { latitude: fitTo.lat, longitude: fitTo.lng, latitudeDelta: (fitTo.radius * 2.6) / 111_320, longitudeDelta: (fitTo.radius * 2.6) / 111_320 }
            : undefined
        }>
        {zone && drawn ? (
          <Polygon
            coordinates={coords(zoneOutline(zone, zone.radius))}
            strokeColor={nextZoneRadius ? 'rgba(243,240,232,0.55)' : 'rgba(200,242,60,0.85)'}
            fillColor={nextZoneRadius ? 'rgba(255,176,32,0.16)' : 'rgba(200,242,60,0.06)'}
            strokeWidth={2}
            lineDashPattern={[8, 6]}
          />
        ) : null}
        {zone && drawn && nextZoneRadius ? (
          <Polygon coordinates={coords(zoneOutline(zone, nextZoneRadius))} strokeColor={colors.lime} fillColor="rgba(200,242,60,0.08)" strokeWidth={2.5} lineDashPattern={[10, 6]} />
        ) : null}
        {zone && !drawn ? (
          <Circle
            center={{ latitude: zone.lat, longitude: zone.lng }}
            radius={zone.radius}
            strokeColor={nextZoneRadius ? 'rgba(243,240,232,0.55)' : 'rgba(200,242,60,0.85)'}
            fillColor={nextZoneRadius ? 'rgba(255,176,32,0.16)' : 'rgba(200,242,60,0.06)'}
            strokeWidth={2}
            lineDashPattern={[8, 6]}
          />
        ) : null}
        {zone && !drawn && nextZoneRadius ? (
          <Circle
            center={{ latitude: zone.lat, longitude: zone.lng }}
            radius={nextZoneRadius}
            strokeColor={colors.lime}
            fillColor="rgba(200,242,60,0.08)"
            strokeWidth={2.5}
            lineDashPattern={[10, 6]}
          />
        ) : null}
        {spot ? (
          <Circle center={{ latitude: spot.lat, longitude: spot.lng }} radius={spot.radius} strokeColor={SPOT} fillColor="rgba(255,225,74,0.18)" strokeWidth={2.5} />
        ) : null}
        {beams.map((b, i) => (
          <Polygon key={`beam-${i}`} coordinates={coords(beamOutline(b))} strokeColor={BEAM} fillColor="rgba(255,42,85,0.28)" strokeWidth={1.5} />
        ))}
        {draft && draft.length >= 3 ? (
          <Polygon coordinates={draft.map((c) => ({ latitude: c.lat, longitude: c.lng }))} strokeColor={colors.lime} fillColor="rgba(200,242,60,0.1)" strokeWidth={2} />
        ) : draft && draft.length === 2 ? (
          <Polyline coordinates={draft.map((c) => ({ latitude: c.lat, longitude: c.lng }))} strokeColor={colors.lime} strokeWidth={2} />
        ) : null}
        {draft?.map((c, i) => (
          <Circle key={`corner-${i}`} center={{ latitude: c.lat, longitude: c.lng }} radius={6} strokeColor={colors.ink} fillColor={colors.lime} strokeWidth={2} />
        ))}
        {boosts.map((b) => (
          <Marker key={b.id} coordinate={{ latitude: b.lat, longitude: b.lng }} anchor={{ x: 0.5, y: 0.3 }}>
            <BoostPin kind={b.kind} />
          </Marker>
        ))}
        {people.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            anchor={{ x: 0.12, y: 0.5 }}
            tracksViewChanges={p.kind === 'ping' || !!p.faro}
            zIndex={p.isMe ? 10 : 1}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View>
                {p.faro ? <FaroRing size={36} /> : null}
                <Avatar name={p.name} size={p.isMe ? 46 : 36} state={personState(p, outOfZone)} glow={p.isMe} frame={p.frame} />
              </View>
              <View style={[styles.tag, p.isMe && { backgroundColor: hunter ? colors.pink : colors.lime }, p.faro && { backgroundColor: FARO }]}>
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
