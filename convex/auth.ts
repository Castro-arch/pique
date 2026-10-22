import Apple from '@auth/core/providers/apple';
import Google from '@auth/core/providers/google';
import { Anonymous } from '@convex-dev/auth/providers/Anonymous';
import { convexAuth } from '@convex-dev/auth/server';

import { EmailOtp } from './emailOtp';

// Google e Apple só entram quando as credenciais estão configuradas no
// Convex (AUTH_GOOGLE_ID/SECRET, AUTH_APPLE_ID/SECRET). Sem elas, o app
// esconde o botão em vez de mostrar um login quebrado (users.loginOptions).
export const loginProviders = {
  google: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  apple: !!(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET),
};

// Para onde o login do Google/Apple pode voltar: o app instalado (pique://),
// o build de desenvolvimento (exp://) e a versão web.
const ALLOWED_REDIRECTS = [/^pique:\/\//, /^exp(\+pique)?:\/\//, /^https?:\/\/localhost(:\d+)?\//, /^https?:\/\/127\.0\.0\.1(:\d+)?\//];

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    EmailOtp,
    // Beta com amigos: conta anônima presa ao celular, sem login (só o nome).
    Anonymous,
    ...(loginProviders.google ? [Google] : []),
    ...(loginProviders.apple ? [Apple] : []),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      const site = process.env.SITE_URL;
      if (site && redirectTo.startsWith(site)) return redirectTo;
      if (ALLOWED_REDIRECTS.some((re) => re.test(redirectTo))) return redirectTo;
      throw new Error(`Endereço de retorno não permitido: ${redirectTo}`);
    },
  },
});
