import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, radius } from '@/theme/tokens';

// Mostrado quando o app abre sem a URL do backend configurada.
export function SetupMissing() {
  return (
    <Screen>
      <View style={styles.center}>
        <Text variant="title">Falta ligar o backend.</Text>
        <Text variant="body" style={{ marginTop: 12 }}>
          Rode o comando abaixo na pasta do projeto. Ele cria o arquivo .env.local com a URL do Convex.
        </Text>
        <View style={styles.code}>
          <Text variant="strong" style={{ color: colors.lime }}>
            npx convex dev
          </Text>
        </View>
        <Text variant="caption">Depois reinicie o Expo (npx expo start -c).</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 4 },
  code: {
    marginVertical: 16,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
  },
});
