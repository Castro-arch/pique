import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors } from '@/theme/tokens';

// Câmera do celular lendo QR (expo-camera). Pede a permissão na hora; se a
// pessoa negou de vez, leva aos ajustes. No site entra o QrCamera.web.tsx.
export function QrCamera({ onCode, torch }: { onCode: (text: string) => void; torch: boolean }) {
  const [permission, request] = useCameraPermissions();
  const done = useRef(false);

  if (!permission) return <View style={styles.fill} />;
  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.ask]}>
        <Text style={{ textAlign: 'center' }}>O Pique precisa da câmera para ler o QR do anfitrião.</Text>
        <Button
          label={permission.canAskAgain ? 'Permitir câmera' : 'Abrir ajustes'}
          onPress={() => (permission.canAskAgain ? request() : Linking.openSettings())}
          style={{ marginTop: 14, alignSelf: 'stretch' }}
        />
      </View>
    );
  }
  return (
    <CameraView
      style={styles.fill}
      facing="back"
      enableTorch={torch}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={({ data }) => {
        if (done.current) return;
        done.current = true;
        onCode(data);
        setTimeout(() => (done.current = false), 1500); // QR errado: deixa tentar de novo
      }}
    />
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.inkDeep },
  ask: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 120 },
});
