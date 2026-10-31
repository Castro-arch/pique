// Permissões no navegador (quem joga pelo site). O navegador pergunta do jeito
// dele; o que não existe na web (localização com a tela bloqueada, câmera pelo
// app) aparece como indisponível. No celular entra o permissions.ts.
export type PermissionId = 'location' | 'background' | 'notifications' | 'microphone' | 'camera';
export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

const fromBrowser = (s: string): PermissionState => (s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'undetermined');

async function query(name: string): Promise<PermissionState> {
  try {
    const r = await navigator.permissions.query({ name: name as PermissionName });
    return fromBrowser(r.state);
  } catch {
    return 'undetermined'; // Safari antigo não responde: deixa pedir
  }
}

export async function checkPermission(id: PermissionId): Promise<PermissionState> {
  switch (id) {
    case 'location':
      return 'geolocation' in navigator ? query('geolocation') : 'unavailable';
    case 'notifications':
      return 'Notification' in window ? fromBrowser(Notification.permission === 'default' ? 'prompt' : Notification.permission) : 'unavailable';
    case 'microphone':
      return 'mediaDevices' in navigator ? query('microphone') : 'unavailable';
    default:
      return 'unavailable';
  }
}

export async function requestPermission(id: PermissionId): Promise<PermissionState> {
  switch (id) {
    case 'location':
      return new Promise((resolve) =>
        navigator.geolocation.getCurrentPosition(
          () => resolve('granted'),
          (e) => resolve(e.code === e.PERMISSION_DENIED ? 'denied' : 'granted'),
          { enableHighAccuracy: true, timeout: 15_000 },
        ),
      );
    case 'notifications':
      if (!('Notification' in window)) return 'unavailable';
      return fromBrowser(await Notification.requestPermission());
    case 'microphone':
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return 'granted';
      } catch {
        return 'denied';
      }
    default:
      return 'unavailable';
  }
}

export const permissionNotes: Partial<Record<PermissionId, string>> = {
  notifications: 'No iPhone, os avisos do site só funcionam depois de "Adicionar à Tela de Início".',
};

// Quando a pessoa nega: no navegador, libera no cadeado ao lado do endereço.
export const deniedHint = 'Negada. Toque no cadeado ao lado do endereço do site e libere.';
export const canOpenSettings = false;
