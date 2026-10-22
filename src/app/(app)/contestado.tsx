import { useMutation } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ruler } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Headline, Text } from '@/components/Text';
import { Sheet } from '@/components/Sheet';
import { photos } from '@/lib/demo';
import { useView } from '@/lib/game';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

// 6.10 O corredor disse que não foi pego. Resolve cara a cara; o jogo segue.
export default function Contestado() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const disputed = useView(id)?.disputed;
  const close = useMutation(api.play.cancelCapture);
  const runner = id ? (disputed?.other ?? '…') : 'Priya';
  const dist = id ? disputed?.distanceM : 4;
  // "Ela tem razão" encerra a contestação e o caçador volta a caçar.
  const accept = async () => {
    if (disputed) await close({ captureId: disputed.id });
    router.back();
  };
  return (
    <View style={{ flex: 1 }}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <Sheet>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 22 }}>
          <Avatar source={id ? undefined : photos.castro} name="Você" size={64} state="hunter" />
          <View style={styles.q}>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.amberInk }}>?</Text>
          </View>
          <Avatar source={id ? undefined : photos.priya} name={runner} size={64} state="runner" />
        </View>
        <Headline variant="h2" dot={colors.amber} style={{ textAlign: 'center', marginTop: 18 }}>{`${runner} disse que não foi pego`}</Headline>
        <Text variant="muted" style={{ textAlign: 'center', marginTop: 8 }}>
          Acontece. Resolvam ali mesmo, cara a cara. O jogo segue enquanto isso.
        </Text>
        {dist != null ? (
          <View style={styles.fact}>
            <Ruler size={18} color={colors.lime} style={{ marginTop: 1 }} />
            <Text variant="small" style={{ flex: 1 }}>
              Vocês estavam a <Text style={{ fontFamily: fonts.bodyStrong, color: colors.paper, fontSize: 13 }}>{dist} m</Text> um do outro quando você marcou.
              Pela regra da partida, pega vale a até 3 passos.
            </Text>
          </View>
        ) : null}
        <Button label="Tem razão, voltar a caçar" style={{ marginTop: 16 }} onPress={accept} />
        <Button variant="secondary" label="Pedir para o anfitrião decidir" style={{ marginTop: 8 }} onPress={() => router.back()} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  q: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  fact: { flexDirection: 'row', gap: 10, marginTop: 16, backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14 },
});
