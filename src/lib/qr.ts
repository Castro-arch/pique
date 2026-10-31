// O QR do lobby leva o link do convite (https://pique.expo.app/convite/CODIGO).
// Daqui sai só o código de 6 caracteres do fim do texto; QR antigo ou de outro
// formato também vale, desde que termine no código. O servidor confere se existe.
const CODE = /([A-Z0-9]{6})\/?$/i;

export const inviteLink = (code: string) => `https://pique.expo.app/convite/${code}`;

export function codeFromQr(text: string): string | null {
  const m = text.trim().match(CODE);
  return m ? m[1].toUpperCase() : null;
}
