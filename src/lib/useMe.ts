import { useConvexAuth, useQuery } from 'convex/react';

import { me as demoMe } from '@/lib/demo';
import { useDemoMode } from '@/lib/demoMode';
import { api } from '../../convex/_generated/api';

type Me = { name: string; username: string; email: string; photo?: number };

// Quem está usando o app: o usuário logado ou o Castro da demonstração.
// Conta real ainda não tem foto (o envio de imagem vem depois): sem `photo`,
// o Avatar mostra a inicial do nome.
export function useMe(): Me {
  const demo = useDemoMode();
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated && !demo ? {} : 'skip');
  if (demo || !me) return { name: demoMe.name, username: demoMe.username, email: 'voce@exemplo.com', photo: demoMe.photo };
  return { name: me.name ?? '', username: me.username ?? '', email: me.email ?? '' };
}
