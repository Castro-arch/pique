import { View } from 'react-native';
import { EyeOff, Heart } from 'lucide-react-native';

import { GameTabs, Hud, HudClock, HudFoot, HudRunners, mmss, Person, RadioCard, useCountdown } from '@/components/Game';
import { MapBackdrop } from '@/components/MapBackdrop';
import { Text } from '@/components/Text';
import { match, photos } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

// 8.3 Espectador: quem foi pego assiste até o fim (o documento permite).
export default function Espectador() {
  const left = useCountdown(28 * 60 + 11);
  const ping = useCountdown(11);
  return (
    <View style={{ flex: 1, backgroundColor: colors.inkSunken }}>
      <MapBackdrop zone={{ cx: 195, cy: 440, r: 190 }} />
      <Person x={197} y={313} photo={photos.teo} state="runner" tag="Teo · ao vivo" />
      <Person x={63} y={467} photo={photos.priya} state="runner" tag="Priya · ao vivo" />
      <Person x={161} y={537} photo={photos.sasha} state="runner" tag="Sasha · ao vivo" />
      <Person x={170} y={425} photo={photos.castro} state="out" tag="Você · fora" />
      <Hud>
        <HudClock
          label="Tempo restante"
          value={mmss(left)}
          sideLabel="Ping em"
          sideValue={mmss(ping)}
          sideColor={colors.lime}
          progress={1 - ping / (match.rules.pingEveryMin * 60)}
        />
        <HudRunners value={0.6} label="3 de 5" />
        <HudFoot badge="Sua posição não é mais enviada" icon={<EyeOff size={14} color={colors.paper} />} right={`Zona ${match.rules.zoneMeters} m`} />
      </Hud>
      <RadioCard from="Sasha" text="Coração a mil aqui.">
        <View
          style={{
            marginTop: 12,
            height: 52,
            borderRadius: radius.lg,
            backgroundColor: colors.ink,
            borderWidth: 1,
            borderColor: colors.inkBorder,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
          <Heart size={16} color={colors.lime} />
          <Text style={{ fontSize: 15, fontFamily: fonts.bodyStrong }}>
            Torcendo pela crew<Text variant="small"> · você assiste até o fim da rodada</Text>
          </Text>
        </View>
      </RadioCard>
      <GameTabs unread={7} />
    </View>
  );
}
