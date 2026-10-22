import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

// Tudo que exige estar logado (ou o modo demonstração).
export const unstable_settings = { initialRouteName: 'index' };

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink } }}>
      {/* Folhas e diálogos sobem por cima da tela anterior */}
      {['lobby/regras', 'lobby/qr', 'jogador/[id]', 'anfitriao', 'sair', 'denunciar', 'pego', 'confirmando', 'contestado', 'menu'].map(
        (name) => (
          <Stack.Screen key={name} name={name} options={{ presentation: 'transparentModal', animation: 'fade' }} />
        ),
      )}
    </Stack>
  );
}
