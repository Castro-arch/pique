import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { colors } from '@/theme/tokens';

// Tudo que exige estar logado (ou o modo demonstração).
export const unstable_settings = { initialRouteName: 'index' };

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink }, animation: Platform.OS === 'web' ? 'none' : 'slide_from_right' }}>
      {/* Folhas e diálogos sobem por cima da tela anterior */}
      {['lobby/regras', 'lobby/qr', 'jogador/[id]', 'anfitriao', 'sair', 'denunciar', 'pego', 'confirmando', 'contestado', 'menu', 'grito'].map(
        (name) => (
          <Stack.Screen key={name} name={name} options={{ presentation: 'transparentModal', animation: 'fade' }} />
        ),
      )}
    </Stack>
  );
}
