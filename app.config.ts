import type { ConfigContext, ExpoConfig } from 'expo/config';

// Estende o app.json com o que depende de ambiente ou de plugins nativos.
// A chave do Google Maps (Android) vem de GOOGLE_MAPS_API_KEY no ambiente do
// build (EAS secret ou .env.local), nunca no repositório, que é público.
// No iPhone o mapa é o Apple Maps e não precisa de chave.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'O Pique usa sua localização só durante a rodada, para o mapa e os pings.',
        locationAlwaysAndWhenInUsePermission:
          'Para a partida continuar com a tela bloqueada, o Pique precisa da sua localização o tempo todo, só enquanto a rodada durar.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        isIosBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission: 'O Pique usa o microfone só enquanto você segura o botão de falar no Radio.',
      },
    ],
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
      },
    ],
  ],
});
