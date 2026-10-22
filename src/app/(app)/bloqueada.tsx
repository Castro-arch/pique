import { router } from 'expo-router';
import { Lock, Radio, Timer } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCountdown, mmss } from '@/components/Game';
import { MapBackdrop } from '@/components/MapBackdrop';
import { Notice } from '@/components/Notice';
import { Text } from '@/components/Text';
import { photos } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';
import { Image } from 'expo-image';

// 7.1 Prévia da tela bloqueada: atividade ao vivo + avisos do Pique.
// Serve para mostrar o que a notificação persistente (foreground service)
// e os pushes vão exibir; não é uma tela do app em si.
export default function Bloqueada() {
  const ping = useCountdown(72);
  const now = new Date();
  const day = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Pressable style={{ flex: 1, backgroundColor: colors.inkDeep }} onPress={() => router.back()} accessibilityLabel="Voltar ao app">
      <MapBackdrop dim={0.55} fades={false} />
      <View style={{ alignItems: 'center', marginTop: 64 }}>
        <Lock size={18} color={colors.paper} />
        <Text style={{ fontSize: 17, fontFamily: fonts.bodyMedium, marginTop: 8 }}>{day}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 84, lineHeight: 90, letterSpacing: -3 }}>{time}</Text>
      </View>

      <View style={styles.live} accessibilityLabel="Atividade ao vivo da partida">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.lime }} />
            <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong }}>TACO42 · você corre</Text>
          </View>
          <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, color: colors.lime }}>oculto</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <View>
            <Text variant="label">Próximo ping</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 32, color: colors.lime }}>{mmss(ping)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="label">Restam</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 32 }}>24:11</Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 12, gap: 8, marginTop: 10 }}>
        <Notice app="PIQUE" when="agora" title="Ping! Os caçadores te viram." body="Sua posição foi enviada. Se mexa agora." icon={<Radio size={18} color={colors.limeInk} />} />
        <Notice
          app="PIQUE · Radio"
          when="1 min"
          title="Priya"
          body="Tô atrás da caixa d'água, ninguém por aqui."
          icon={<Image source={photos.priya} style={{ width: 36, height: 36, borderRadius: 10 }} />}
          opacity={0.92}
        />
        <Notice app="PIQUE" when="3 min" title="A zona encolhe em 1 min" body="Vai de 420 m para 300 m." icon={<Timer size={18} color={colors.amberInk} />} opacity={0.85} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  live: {
    marginHorizontal: 12,
    marginTop: 26,
    backgroundColor: 'rgba(16,20,24,0.85)',
    borderRadius: radius.xxl,
    padding: 16,
  },
});
