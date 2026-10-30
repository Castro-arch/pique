import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Text } from '@/components/Text';
import { MAP_CREDIT } from '@/lib/mapStyle';
import { colors, fonts } from '@/theme/tokens';

import { personState, personTag, type MapPerson } from './gameMapTypes';

// Jogador no mapa de ruas (site e Android): foto com moldura e etiqueta.
export function PersonPin({ p, now, hunter, outOfZone }: { p: MapPerson; now: number; hunter: boolean; outOfZone: boolean }) {
  return (
    <View collapsable={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Avatar name={p.name} size={p.isMe ? 46 : 36} state={personState(p, outOfZone)} glow={p.isMe} frame={p.frame} />
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
  );
}

// Crédito que o OpenFreeMap e o OpenStreetMap pedem. Fica no vão entre o Radio e as abas.
export function MapCredit() {
  return (
    <Text pointerEvents="none" style={styles.credit}>
      {MAP_CREDIT}
    </Text>
  );
}

const styles = StyleSheet.create({
  tag: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: 'rgba(26,32,39,0.92)' },
  credit: { position: 'absolute', left: 18, bottom: 92, fontSize: 9, color: 'rgba(243,240,232,0.6)' },
});
