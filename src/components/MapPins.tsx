import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar } from '@/components/Avatar';
import { useDock } from '@/components/Game';
import { Text } from '@/components/Text';
import { MAP_CREDIT } from '@/lib/mapStyle';
import { colors, fonts } from '@/theme/tokens';

import { personState, personTag, type MapPerson } from './gameMapTypes';

// Tamanho da bolinha do jogador no mapa (pequena, para não tampar as ruas).
export const pinSize = (isMe: boolean) => (isMe ? 26 : 20);

// Jogador no mapa de ruas (site e Android): foto com moldura e etiqueta.
export function PersonPin({ p, now, hunter, outOfZone }: { p: MapPerson; now: number; hunter: boolean; outOfZone: boolean }) {
  return (
    <View collapsable={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Beak heading={p.heading} size={pinSize(p.isMe)} color={p.role === 'hunter' ? colors.pink : colors.lime}>
        <Avatar name={p.name} size={pinSize(p.isMe)} state={personState(p, outOfZone)} glow={p.isMe} frame={p.frame} />
      </Beak>
      <View style={[styles.tag, p.isMe && { backgroundColor: hunter ? colors.pink : colors.lime }]}>
        <Text
          style={{
            fontSize: p.isMe ? 10 : 9,
            fontFamily: fonts.bodyStrong,
            color: p.isMe ? (hunter ? colors.pinkInk : colors.limeInk) : colors.paper,
          }}>
          {personTag(p, now)}
        </Text>
      </View>
    </View>
  );
}

// Biquinho em volta do avatar apontando para onde a pessoa está virada.
function Beak({ heading, size, color, children }: { heading?: number | null; size: number; color: string; children: React.ReactNode }) {
  if (heading === null || heading === undefined) return <>{children}</>;
  const box = size + 16;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View pointerEvents="none" style={{ position: 'absolute', width: box, height: box, transform: [{ rotate: `${heading}deg` }] }}>
        <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
          <Path d={`M${box / 2 - 6} 8 L${box / 2} 0 L${box / 2 + 6} 8 Z`} fill={color} stroke="#101418" strokeWidth={1.5} strokeLinejoin="round" />
        </Svg>
      </View>
      {children}
    </View>
  );
}

// Crédito que o OpenFreeMap e o OpenStreetMap pedem. Fica no vão entre o Radio e as abas.
export function MapCredit() {
  // Na faixa entre as abas e a borda de baixo da tela.
  const { dock } = useDock();
  return (
    <Text pointerEvents="none" style={[styles.credit, { bottom: Math.max(1, dock - 15) }]}>
      {MAP_CREDIT}
    </Text>
  );
}

const styles = StyleSheet.create({
  tag: { borderRadius: 999, paddingVertical: 2, paddingHorizontal: 6, backgroundColor: 'rgba(26,32,39,0.92)' },
  // Embaixo das abas, centralizado: não disputa espaço com o cartão do Radio.
  credit: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 8, color: 'rgba(243,240,232,0.45)' },
});
