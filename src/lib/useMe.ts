import { useConvexAuth, useQuery } from 'convex/react';

import { me as demoMe } from '@/lib/demo';
import { useDemoMode } from '@/lib/demoMode';
import { api } from '../../convex/_generated/api';

// Quem está usando o app: o usuário logado ou o Castro da demonstração.
export function useMe() {
  const demo = useDemoMode();
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated && !demo ? {} : 'skip');
  if (demo || !me) return { name: demoMe.name, username: demoMe.username, email: 'voce@exemplo.com', photo: demoMe.photo };
  return {
    name: me.name ?? '',
    username: me.username ?? '',
    email: me.email ?? '',
    photo: demoMe.photo, // foto de perfil real chega com o envio de imagem
  };
}
