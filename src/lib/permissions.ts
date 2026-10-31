import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Todas as permissões que o Pique usa, pedidas numa tela só (/permissoes).
// No navegador entra o permissions.web.ts.
export type PermissionId = 'location' | 'background' | 'notifications' | 'microphone' | 'camera';
export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

type Answer = { granted: boolean; canAskAgain?: boolean };
const state = (a: Answer): PermissionState => (a.granted ? 'granted' : a.canAskAgain === false ? 'denied' : 'undetermined');

export async function checkPermission(id: PermissionId): Promise<PermissionState> {
  switch (id) {
    case 'location':
      return state(await Location.getForegroundPermissionsAsync());
    case 'background':
      return state(await Location.getBackgroundPermissionsAsync());
    case 'notifications':
      return state(await Notifications.getPermissionsAsync());
    case 'microphone':
      return state(await getRecordingPermissionsAsync());
    case 'camera': {
      const [cam, lib] = await Promise.all([ImagePicker.getCameraPermissionsAsync(), ImagePicker.getMediaLibraryPermissionsAsync()]);
      return cam.granted && lib.granted ? 'granted' : state(cam.granted ? lib : cam);
    }
  }
}

export async function requestPermission(id: PermissionId): Promise<PermissionState> {
  switch (id) {
    case 'location':
      return state(await Location.requestForegroundPermissionsAsync());
    case 'background': {
      // O sistema só oferece "o tempo todo" depois de liberar durante o uso.
      const fg = await Location.requestForegroundPermissionsAsync();
      if (!fg.granted) return state(fg);
      return state(await Location.requestBackgroundPermissionsAsync());
    }
    case 'notifications':
      return state(await Notifications.requestPermissionsAsync());
    case 'microphone':
      return state(await requestRecordingPermissionsAsync());
    case 'camera': {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return cam.granted && lib.granted ? 'granted' : state(cam.granted ? lib : cam);
    }
  }
}

// Onde cada permissão existe. "o tempo todo" no Android abre os ajustes do sistema.
export const permissionNotes: Partial<Record<PermissionId, string>> = {
  background: Platform.OS === 'android' ? 'Nos ajustes, escolha "Permitir o tempo todo".' : 'Escolha "Sempre" quando o iPhone perguntar.',
};

// Quando a pessoa nega: no celular, só os ajustes do sistema liberam de novo.
export const deniedHint = 'Negada. Libere nos ajustes do aparelho.';
export const canOpenSettings = true;
