import { useQuery } from 'convex/react';
import { View } from 'react-native';

import { BENTO } from '@/components/Bento';
import { Loading } from '@/components/Loading';
import { ProfileView } from '@/components/ProfileView';
import { api } from '../../../convex/_generated/api';

// 20.3 Meu perfil.
export default function Perfil() {
  const p = useQuery(api.friends.profile, {});
  if (p === undefined) return <Loading />;
  if (p === null) return <View style={{ flex: 1, backgroundColor: BENTO.ink }} />;
  return <ProfileView p={p} />;
}
