import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Sun, X } from '@/components/icons';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { match } from '@/lib/demo';
import { inviteLink } from '@/lib/qr';
import { useLobby } from '@/lib/game';
import { colors, fonts } from '@/theme/tokens';

// 5.4 QR da partida: quem está do lado escaneia na tela Entrar.
export default function QRLobby() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const code = useLobby(id)?.code ?? match.code;
  const link = inviteLink(code);
  return (
    <View style={{ flex: 1 }}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <Sheet top={118} style={{ alignItems: 'center' }}>
        <View style={styles.head}>
          <Text style={{ fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.8 }}>Chame a crew</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => router.back()} style={styles.close}>
            <X size={20} color={colors.paper} />
          </Pressable>
        </View>
        <Text variant="muted" style={{ alignSelf: 'stretch', fontSize: 14, marginTop: 2 }}>
          Quem estiver do seu lado escaneia na tela <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14 }}>Entrar</Text>.
        </Text>

        <View style={styles.qr} accessible accessibilityRole="image" accessibilityLabel={`QR code da partida ${code}`}>
          <QRCode value={link} size={220} color={colors.ink} backgroundColor={colors.paper} ecl="M" />
        </View>
        <Text variant="label" style={{ marginTop: 16 }}>ou digite o código</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 44, lineHeight: 48, letterSpacing: 0.9 }}>{code}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Sun size={14} color={colors.paperMuted} />
          <Text variant="label">Brilho no máximo enquanto o QR estiver aberto</Text>
        </View>

        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
          <Button label="Mandar link" style={{ flex: 1 }} onPress={() => Share.share({ message: `Bora jogar Pique? ${link}` })} />
          <Button variant="secondary" label="Copiar código" style={{ flex: 1, backgroundColor: colors.ink }} onPress={() => Clipboard.setStringAsync(code)} />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  close: { width: 44, height: 44, marginRight: -8, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  qr: { marginTop: 22, padding: 14, borderRadius: 28, backgroundColor: colors.paper },
});
