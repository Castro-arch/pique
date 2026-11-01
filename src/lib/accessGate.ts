import { useConvexAuth, useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';
import { useDemoMode } from './demoMode';
import { LEGAL_VERSION } from './legal';

// A "porta" que a conta precisa passar antes de entrar no app (ver
// src/app/_layout.tsx): convite do teste, aceite dos termos ou o nome.
// null quando não há porta (sem sessão, carregando ou já dentro).
export type Gate = '/teste-fechado' | '/aceitar-termos' | '/nome';

type Me = { betaOk: boolean; termsVersion: string | null; username?: string | null } | null | undefined;

export function gateFor(isAuthenticated: boolean, me: Me, demo: boolean): Gate | null {
  if (demo || !isAuthenticated || !me) return null;
  if (!me.betaOk) return '/teste-fechado';
  if (me.termsVersion !== LEGAL_VERSION) return '/aceitar-termos';
  if (!me.username) return '/nome';
  return null;
}

export function useAccessGate() {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip');
  return gateFor(isAuthenticated, me, useDemoMode());
}
