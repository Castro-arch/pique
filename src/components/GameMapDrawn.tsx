import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BoostPin } from '@/components/Boosts';
import { MapBackdrop, MapPin } from '@/components/MapBackdrop';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

import { personState, personTag, type GameMapProps, type MapZone } from './gameMapTypes';

// Mapa desenhado no próprio app: a reserva quando não há satélite (sem a
// chave da Esri). Os jogadores e boosts ficam no espaço 390 x 844 do design.

// Centro da zona no desenho (espaço 390 x 844) e quanto o raio ocupa na tela.
const CX = 195;
const CY = 440;
const R_PX = 190;
const M_PER_DEG = 111_320;

// Converte lat/lng em coordenadas do desenho, com a zona sempre no meio.
function project(p: { lat: number; lng: number }, zone: MapZone) {
  const s = R_PX / zone.radius;
  const dx = (p.lng - zone.lng) * M_PER_DEG * Math.cos((zone.lat * Math.PI) / 180);
  const dy = (p.lat - zone.lat) * M_PER_DEG;
  return { x: CX + dx * s, y: CY - dy * s };
}

export function DrawnMap({ zone, nextZoneRadius, people, now, hunter, outOfZone, dim = 0, boosts = [] }: GameMapProps) {
  return (
    <MapBackdrop
      zone={zone ? { cx: CX, cy: CY, r: R_PX } : undefined}
      shrinkTo={zone && nextZoneRadius ? (nextZoneRadius / zone.radius) * R_PX : undefined}
      dim={dim}>
      {zone
        ? boosts.map((b) => {
            const { x, y } = project(b, zone);
            return (
              <MapPin key={b.id} x={x - 55} y={y - 22}>
                <View style={{ width: 110 }}>
                  <BoostPin kind={b.kind} />
                </View>
              </MapPin>
            );
          })
        : null}
      {zone
        ? people.map((p) => {
            const { x, y } = project(p, zone);
            const size = p.isMe ? 46 : 36;
            return (
              <MapPin key={p.id} x={x - size / 2} y={y - size / 2}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Avatar name={p.name} size={size} state={personState(p, outOfZone)} glow={p.isMe} frame={p.frame} />
                  <View
                    style={{
                      borderRadius: 999,
                      paddingVertical: 3,
                      paddingHorizontal: 8,
                      backgroundColor: p.isMe ? (hunter ? colors.pink : colors.lime) : colors.inkRaised,
                    }}>
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
              </MapPin>
            );
          })
        : null}
    </MapBackdrop>
  );
}
