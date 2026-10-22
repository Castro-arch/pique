import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { useConvexAuth, useQuery } from 'convex/react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SetupMissing } from '@/components/SetupMissing';
import { api } from '../../convex/_generated/api';
import { convex, tokenStorage } from '@/lib/convex';
import { useDemoMode } from '@/lib/demoMode';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  if (!convex) return <SetupMissing />;

  return (
    <ConvexAuthProvider client={convex} storage={tokenStorage}>
      <StatusBar style="light" />
      <Routes />
    </ConvexAuthProvider>
  );
}

// Três estados de acesso:
// - sem sessão: grupo (entrada) — boas-vindas, e-mail e código
// - logado sem usuário: tela "nome" (cadastro)
// - logado com usuário: grupo (app) — todo o resto
// Em desenvolvimento, a Galeria de telas liga o modo demonstração, que abre o app sem login.
function Routes() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip');
  const demo = useDemoMode();

  // Espera saber se há sessão e, logado, se o perfil já carregou.
  if (!demo && (isLoading || (isAuthenticated && me === undefined))) return null;

  const needsProfile = !demo && isAuthenticated && !!me && !me.username;
  const inside = demo || (isAuthenticated && !needsProfile);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink } }}>
      <Stack.Protected guard={!isAuthenticated && !demo}>
        <Stack.Screen name="(entrada)" />
      </Stack.Protected>
      <Stack.Protected guard={needsProfile}>
        <Stack.Screen name="nome" />
      </Stack.Protected>
      <Stack.Protected guard={inside}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="galeria" />
      </Stack.Protected>
    </Stack>
  );
}
