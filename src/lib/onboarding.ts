import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Marca, neste aparelho, que a pessoa já passou pela tela de permissões.
// Assim ela aparece uma vez depois do nome, e não a cada abertura.
const KEY = 'pique.permissionsSeen';

export async function permissionsSeen() {
  try {
    if (Platform.OS === 'web') return window.localStorage.getItem(KEY) === '1';
    return (await SecureStore.getItemAsync(KEY)) === '1';
  } catch {
    return true; // sem armazenamento (aba anônima): não insiste
  }
}

export async function markPermissionsSeen() {
  try {
    if (Platform.OS === 'web') window.localStorage.setItem(KEY, '1');
    else await SecureStore.setItemAsync(KEY, '1');
  } catch {
    // sem armazenamento: tudo bem, só volta a aparecer
  }
}
