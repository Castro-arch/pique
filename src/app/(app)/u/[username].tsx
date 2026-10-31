import { useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { BENTO } from '@/components/Bento';
import { Loading } from '@/components/Loading';
import { BackButton } from '@/components/Nav';
import { ProfileView } from '@/components/ProfileView';
import { Text } from '@/components/Text';
import { api } from '../../../../convex/_generated/api';

// Perfil de outra pessoa pelo @ (é para onde o link e o QR de amizade levam:
// pique.expo.app/u/nome).
export default function PerfilDeAlguem() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const p = useQuery(api.friends.profile, { username });
  if (p === undefined) return <Loading />;
  if (p === null)
    return (
      <View style={{ flex: 1, backgroundColor: BENTO.ink, padding: 20, paddingTop: 60 }}>
        <BackButton />
        <Text variant="h2" style={{ marginTop: 20 }}>Ninguém com esse @</Text>
        <Text variant="muted" style={{ marginTop: 8 }}>Confira o nome com a pessoa.</Text>
      </View>
    );
  return <ProfileView p={p} />;
}
