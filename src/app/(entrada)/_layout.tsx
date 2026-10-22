import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

// Telas antes do login: boas-vindas, e-mail e código.
export const unstable_settings = { initialRouteName: 'bem-vindo' };

export default function EntradaLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink } }} />;
}
