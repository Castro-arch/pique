import Apple from '@auth/core/providers/apple';
import Google from '@auth/core/providers/google';
import { Anonymous } from '@convex-dev/auth/providers/Anonymous';
import { convexAuth } from '@convex-dev/auth/server';

import { EmailOtp } from './emailOtp';
import { Recovery } from './recovery';

// Google e Apple só entram quando as credenciais estão configuradas no
// Convex (AUTH_GOOGLE_ID/SECRET, AUTH_APPLE_ID/SECRET). Sem elas, o app
// esconde o botão em vez de mostrar um login quebrado (users.loginOptions).
export const loginProviders = {
  google: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  apple: !!(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET),
};

// Para onde o login do Google/Apple pode voltar: o app instalado (pique://) e
// a mesma origem do site (SITE_URL). O build de desenvolvimento (exp://) e o
// localhost só com ALLOW_DEV_REDIRECTS=1, nunca em produção: comparar por
// prefixo aceitava "https://pique.app.evil.com" e exp:// de qualquer host.
const DEV_REDIRECTS = [/^exp(\+pique)?:\/\//, /^https?:\/\/localhost(:\d+)?\//, /^https?:\/\/127\.0\.0\.1(:\d+)?\//];
const sameOrigin = (a: string, b: string) => {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    EmailOtp,
    // Beta com amigos: conta anônima presa ao celular, sem login (só o nome).
    Anonymous,
    // Voltar à conta anônima em outro aparelho, com o código de recuperação.
    Recovery,
    ...(loginProviders.google ? [Google] : []),
    ...(loginProviders.apple ? [Apple] : []),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      const site = process.env.SITE_URL;
      if (site && sameOrigin(redirectTo, site)) return redirectTo;
      if (redirectTo.startsWith('pique://')) return redirectTo;
      if (process.env.ALLOW_DEV_REDIRECTS === '1' && DEV_REDIRECTS.some((re) => re.test(redirectTo))) return redirectTo;
      throw new Error(`Endereço de retorno não permitido: ${redirectTo}`);
    },
  },
});
