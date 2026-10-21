import { convexAuth } from '@convex-dev/auth/server';

import { EmailOtp } from './emailOtp';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [EmailOtp],
});
