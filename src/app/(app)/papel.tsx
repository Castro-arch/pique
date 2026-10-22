import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AvatarStack } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Nav';
import { RoleDot } from '@/components/RoleTag';
import { Screen, Spacer } from '@/components/Screen';
import { Text } from '@/components/Text';
import { match, photos } from '@/lib/demo';
import { colors, fonts } from '@/theme/tokens';

// 5.9 e 5.10 Revelação do papel: tela inteira na cor do lado.
export default function Papel() {
  const { papel = 'runner' } = useLocalSearchParams<{ papel?: 'runner' | 'hunter' }>();
  const hunter = papel === 'hunter';
  const bg = hunter ? colors.pink : colors.lime;
  const ink = hunter ? colors.pinkInk : colors.limeInk;
  const { durationMin, headStartMin, pingEveryMin } = match.rules;

  return (
    <Screen background={bg} scroll>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo size={22} color={ink} dot={ink} />
        <View style={[styles.pill, { backgroundColor: ink }]}>
          <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong }}>{`${match.code} · Rodada ${match.round}`}</Text>
        </View>
      </View>
      <View style={styles.role}>
        <RoleDot side={papel} size={14} color={ink} />
        <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: ink }}>Seu papel · {hunter ? 'Caçador' : 'Corredor'}</Text>
      </View>

      <Spacer />
      <Text accessibilityRole="header" style={[styles.hero, { color: ink, fontSize: hunter ? 132 : 150, lineHeight: hunter ? 116 : 136 }]}>
        {hunter ? 'Você\npega' : 'Corra'}
        <Text style={{ color: colors.paper }}>.</Text>
      </Text>
      <Spacer />

      <Text style={[styles.brief, { color: ink }]}>
        {hunter
          ? `Encontre e pegue os 4 corredores em ${durationMin} min. Eles têm ${headStartMin} min de vantagem.`
          : `Fique escondido por ${durationMin} min. Você tem ${headStartMin} min de vantagem. Depois, os caçadores recebem um ping a cada ${pingEveryMin} min.`}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }}>
        <AvatarStack
          sources={hunter ? [photos.leo] : [photos.jonah, photos.priya, photos.teo, photos.sasha]}
          size={30}
          ring={ink}
        />
        <Text style={{ flex: 1, fontSize: 14, fontFamily: fonts.bodyStrong, color: ink }}>
          {hunter ? 'Você caça com o Leo' : 'Você corre com Jonah, Priya, Teo e Sasha'}
        </Text>
      </View>
      <View style={[styles.tip, { backgroundColor: hunter ? 'rgba(42,6,16,0.12)' : 'rgba(22,32,10,0.12)' }]}>
        <Text style={{ fontSize: 13, lineHeight: 18, fontFamily: fonts.bodyStrong, color: ink }}>
          {hunter
            ? 'Primeiro passo: combine no Radio quem cobre cada lado da zona.'
            : `Primeiro passo: saia do centro agora. Nos ${headStartMin} primeiros minutos ninguém te vê.`}
        </Text>
      </View>
      <Text style={{ fontSize: 13, lineHeight: 18, marginTop: 10, color: ink, opacity: 0.75 }}>
        Os alertas chegam com a tela bloqueada. Só não feche o Pique deslizando.
      </Text>

      <Button
        variant="dark"
        label="Bora"
        style={{ marginTop: 18, backgroundColor: ink }}
        onPress={() => router.replace({ pathname: '/jogo', params: { estado: hunter ? 'cacador-espera' : 'corredor-vantagem' } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  role: {
    marginTop: 26,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.paper,
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 14,
  },
  hero: { fontFamily: fonts.display, letterSpacing: -8 },
  brief: { fontFamily: fonts.display, fontSize: 25, lineHeight: 28, letterSpacing: -0.7 },
  tip: { marginTop: 14, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
});
