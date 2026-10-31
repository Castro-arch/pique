import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { Loading } from '@/components/Loading';
import { SetupMissing } from '@/components/SetupMissing';
import { api } from '../../convex/_generated/api';
import '@/lib/backgroundLocation'; // define a tarefa de posição em segundo plano
import '@/lib/shoutSound'; // no site, destrava o som do grito no primeiro toque
import { convex, tokenStorage } from '@/lib/convex';
import { useDemoMode } from '@/lib/demoMode';
import { setupNotificationChannels } from '@/lib/notifications';
import { enablePush } from '@/lib/webPush';
import { setupWebHead } from '@/lib/webHead';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();
setupWebHead();
setupNotificationChannels().catch(() => {});

// Quanto esperamos as fontes antes de abrir com a do sistema. Rede lenta ou
// uma fonte que falha não podem deixar o app parado na tela de carregamento.
const FONT_WAIT_MS = 3000;

export default function RootLayout() {
  // No site as fontes vêm do public/index.html (WOFF2, bem mais leves) e
  // aparecem sem travar a abertura; no celular, os TTF de dentro do app.
  const [fontsLoaded, fontError] = useFonts(
    Platform.OS === 'web'
      ? {}
      : { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold },
  );

  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), FONT_WAIT_MS);
    return () => clearTimeout(t);
  }, []);
  const ready = fontsLoaded || !!fontError || waited;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <Loading />;
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
  const saveSubscription = useMutation(api.alerts.saveSubscription);

  // Site com avisos liberados: inscreve este navegador no push (renova a cada abertura).
  useEffect(() => {
    if (isAuthenticated && me?.username) enablePush(saveSubscription).catch(() => {});
  }, [isAuthenticated, me?.username, saveSubscription]);

  // Espera saber se há sessão e, logado, se o perfil já carregou.
  if (!demo && (isLoading || (isAuthenticated && me === undefined))) return <Loading />;

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
