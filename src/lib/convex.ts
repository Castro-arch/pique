import { ConvexReactClient } from 'convex/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

export const convex = convexUrl
  ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
  : null;

// Token de sessão guardado no cofre do sistema (Keychain / Keystore).
// No web cai para localStorage, que é o único armazenamento disponível lá.
export const tokenStorage =
  Platform.OS === 'web'
    ? undefined
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };
