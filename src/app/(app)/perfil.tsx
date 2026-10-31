import { useQuery } from 'convex/react';
import { View } from 'react-native';

import { BENTO } from '@/components/Bento';
import { Loading } from '@/components/Loading';
import { ProfileView, type Profile } from '@/components/ProfileView';
import { useDemoMode } from '@/lib/demoMode';
import { api } from '../../../convex/_generated/api';

// Modo demonstração (galeria de telas): um perfil de exemplo.
const DEMO: Profile = {
  id: 'demo',
  name: 'Castro',
  username: 'castro',
  frame: 'chamas',
  isMe: true,
  stats: { games: 24, wins: 15, catches: 9, escapes: 6, bestHiddenMs: 41 * 60_000, distanceM: 6200 },
  level: { xp: 3140, level: 7, name: 'Esperto', next: 'Raposa', into: 140, need: 500 },
  medals: [
    { id: 'fantasma', name: 'Fantasma', hint: 'Termine livre 3 rodadas', won: true },
    { id: 'chamas', name: 'Em chamas', hint: 'Ganhe 5 rodadas', won: true },
    { id: 'maratona', name: 'Maratona', hint: 'Corra 5 km somando tudo', won: true },
    { id: 'cacador', name: 'Caçador nato', hint: 'Pegue 10 corredores', won: false },
    { id: 'escondido', name: 'Paciência', hint: 'Fique 20 min sem ser pego', won: true },
    { id: 'veterano', name: 'Veterano', hint: 'Jogue 25 rodadas', won: false },
  ],
  friends: 12,
  live: null,
  status: 'me',
  together: null,
} as Profile;

// 20.3 Meu perfil.
export default function Perfil() {
  const demo = useDemoMode();
  const p = useQuery(api.friends.profile, demo ? 'skip' : {});
  if (demo) return <ProfileView p={DEMO} />;
  if (p === undefined) return <Loading />;
  if (p === null) return <View style={{ flex: 1, backgroundColor: BENTO.ink }} />;
  return <ProfileView p={p} />;
}
