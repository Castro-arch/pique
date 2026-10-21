import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
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
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
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

function Routes() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip');

  // Espera saber se há sessão e, logado, se o perfil já carregou.
  if (isLoading || (isAuthenticated && me === undefined)) return null;

  const needsProfile = isAuthenticated && !!me && !me.username;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink } }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={needsProfile}>
        <Stack.Screen name="profile" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && !needsProfile}>
        <Stack.Screen name="index" />
      </Stack.Protected>
    </Stack>
  );
}
