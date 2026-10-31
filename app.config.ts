import type { ConfigContext, ExpoConfig } from 'expo/config';

// Estende o app.json com o que depende de ambiente ou de plugins nativos.
// Mapa: no Android é o MapLibre com as ruas do OpenFreeMap (grátis, sem chave);
// no iPhone é o Apple Maps, também sem chave. O react-native-maps fica para o iPhone.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  ios: {
    ...config.ios,
    infoPlist: {
      ...config.ios?.infoPlist,
      // O Pique só usa a criptografia padrão do sistema (HTTPS). Declarar isso
      // aqui evita a pergunta de exportação a cada build no TestFlight.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
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
      'expo-image-picker',
      {
        photosPermission: 'O Pique usa suas fotos só quando você escolhe uma para o perfil ou para postar o fim da rodada.',
        cameraPermission: 'O Pique usa a câmera só quando você tira uma foto para o perfil ou para o fim da rodada.',
      },
    ],
    'expo-notifications',
    ['expo-camera', { cameraPermission: 'O Pique usa a câmera para ler o QR do anfitrião e entrar na partida.' }],
    'react-native-maps',
    '@maplibre/maplibre-react-native',
  ],
});
