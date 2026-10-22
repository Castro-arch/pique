import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, Share2, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button } from '@/components/Button';
import { Segmented } from '@/components/Controls';
import { MapBackdrop } from '@/components/MapBackdrop';
import { CloseButton } from '@/components/Nav';
import { Screen } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { illustrations, match, photos } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

type Visual = 'mapa' | 'selfie' | 'adesivo';

// Trajeto da rodada (só no celular, como manda o documento).
const route = 'M70 330 C90 280 70 240 120 210 C160 186 150 140 200 120 C240 104 250 70 290 60';

// 8.8 a 8.10 Post da rodada, no estilo dos apps de corrida: dá vontade de postar,
// e cada post divulga o Pique de graça. A imagem final sai com react-native-view-shot
// quando o compartilhamento for para o celular.
export default function Post() {
  const { visual: initial = 'mapa' } = useLocalSearchParams<{ visual?: Visual }>();
  const [visual, setVisual] = useState<Visual>(initial);
  const share = () => Share.share({ message: `Fiquei 30:00 escondido no Pique e ninguém me achou. Bora? https://pique.app/p/${match.code}` });

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 }}>
        <Text variant="small">{`${match.code} · Rodada ${match.round}`}</Text>
        <CloseButton onPress={() => router.replace('/placar')} />
      </View>
      <Headline variant="h2" style={{ marginTop: 6 }}>Ninguém te achou</Headline>
      <Text variant="muted" style={{ marginTop: 6 }}>Isso merece um post. Escolha o visual e compartilhe.</Text>

      <View style={{ marginTop: 16 }}>{visual === 'mapa' ? <MapPost /> : visual === 'selfie' ? <SelfiePost /> : <StickerPost />}</View>

      <Segmented<Visual>
        value={visual}
        onChange={setVisual}
        style={{ marginTop: 14 }}
        options={[
          { value: 'mapa', label: 'Mapa' },
          { value: 'selfie', label: 'Selfie da crew' },
          { value: 'adesivo', label: 'Adesivo' },
        ]}
      />

      <Button
        label={visual === 'adesivo' ? 'Copiar adesivo para o story' : 'Postar no story'}
        icon={<Share2 size={18} color={colors.limeInk} />}
        style={{ marginTop: 14 }}
        onPress={share}
      />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Button variant="secondary" size="md" label="WhatsApp" style={{ flex: 1 }} onPress={share} />
        <Button variant="secondary" size="md" label="Salvar" style={{ flex: 1 }} />
        <Button variant="secondary" size="md" label="Revanche" style={{ flex: 1 }} onPress={() => router.replace('/sorteio')} />
      </View>
    </Screen>
  );
}

function MapPost() {
  return (
    <View style={styles.card} accessible accessibilityRole="image" accessibilityLabel="Prévia do post: trajeto no mapa, 30 minutos escondido, 1,9 km, 14 pings e caçador mais perto a 38 metros">
      <MapBackdrop fades={false} />
      <Svg width="100%" height="100%" viewBox="0 0 350 440" style={StyleSheet.absoluteFill}>
        <Path d={route} stroke={colors.lime} strokeWidth={5} fill="none" strokeLinecap="round" />
        <Circle cx={70} cy={330} r={7} fill={colors.paper} />
        <Circle cx={180} cy={190} r={26} stroke={colors.pink} strokeDasharray="4 5" strokeWidth={2} fill="none" />
      </Svg>
      <Image source={photos.castro} style={styles.endFace} />
      <View style={styles.near}>
        <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: colors.pinkInk }}>Leo a 38 m</Text>
      </View>
      <LinearGradient colors={['rgba(11,14,17,0)', 'rgba(11,14,17,0.92)']} style={styles.bottomFade} />
      <View style={styles.topRow}>
        <Brand />
        <View style={styles.record}>
          <Trophy size={12} color={colors.limeInk} />
          <Text style={{ fontSize: 11, fontFamily: fonts.bodyStrong, color: colors.limeInk }}>Recorde pessoal</Text>
        </View>
      </View>
      <View style={styles.numbers}>
        <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 0.6, color: colors.lime }}>ESCAPEI DE 2 CAÇADORES</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 64, lineHeight: 64, letterSpacing: -2 }}>
          30:00<Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14 }}> escondido</Text>
        </Text>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
          <Mini label="Distância" value="1,9 km" />
          <Mini label="Pings livres" value="14" />
          <Mini label="Mais perto" value="38 m" />
        </View>
        <Footer />
      </View>
    </View>
  );
}

function SelfiePost() {
  return (
    <View style={styles.card} accessible accessibilityRole="image" accessibilityLabel="Prévia do post com a foto da crew e os números da rodada">
      <Image source={illustrations.aguardando} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(11,14,17,0.5)', 'rgba(11,14,17,0)', 'rgba(11,14,17,0.92)']} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.topRow}>
        <Brand />
        <Pressable accessibilityRole="button" style={styles.swap}>
          <Camera size={14} color={colors.paper} />
          <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong }}>Trocar foto</Text>
        </Pressable>
      </View>
      <View style={styles.numbers}>
        <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 0.6, color: colors.lime }}>A CREW SOBREVIVEU · {match.code}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 64, lineHeight: 64, letterSpacing: -2 }}>30:00</Text>
        <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong }}>1,9 km corridos · 14 pings livres</Text>
        <Footer />
      </View>
    </View>
  );
}

function StickerPost() {
  return (
    <View style={[styles.card, styles.checker]} accessible accessibilityRole="image" accessibilityLabel="Prévia do adesivo transparente com o trajeto e os números da rodada">
      <Text variant="label" style={{ position: 'absolute', top: 14, alignSelf: 'center' }}>Fundo transparente · cola em qualquer foto</Text>
      <View style={styles.sticker}>
        <Svg width={140} height={90} viewBox="40 40 270 310">
          <Path d={route} stroke={colors.lime} strokeWidth={9} fill="none" strokeLinecap="round" />
        </Svg>
        <Text style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 56, letterSpacing: -2, color: colors.paper }}>30:00</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.lime }}>ninguém me achou</Text>
        <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, marginTop: 6 }}>1,9 km · 14 pings · 38 m</Text>
        <View style={{ marginTop: 8 }}>
          <Brand />
        </View>
      </View>
    </View>
  );
}

function Brand() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: colors.lime }} />
      <Text style={{ fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.5 }}>pique</Text>
    </View>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={{ fontSize: 11, color: colors.paperMuted }}>{label}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 18 }}>{value}</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer}>
      <Text variant="label">Pique-esconde de verdade, pela cidade.</Text>
      <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong }}>pique.app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: 440, borderRadius: radius.xxl, overflow: 'hidden', backgroundColor: colors.inkSunken },
  checker: { backgroundColor: '#2A2F35', borderWidth: 1, borderColor: colors.inkBorder, alignItems: 'center', justifyContent: 'center' },
  sticker: { alignItems: 'center' },
  topRow: { position: 'absolute', left: 16, right: 16, top: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  record: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.lime, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 8 },
  swap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,20,24,0.7)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  endFace: { position: 'absolute', left: '80%', top: '10%', width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: colors.lime },
  near: { position: 'absolute', left: '40%', top: '37%', backgroundColor: colors.pink, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 240 },
  numbers: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(243,240,232,0.15)' },
});
