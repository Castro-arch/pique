import { useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { TopBar } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useDemoMode } from '@/lib/demoMode';
import { useMe } from '@/lib/useMe';
import { colors, fonts } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

// 3.5 Editar perfil
export default function EditarPerfil() {
  const me = useMe();
  const demo = useDemoMode();
  const setProfile = useMutation(api.users.setProfile);
  const [name, setName] = useState(me.name);
  const [username, setUsername] = useState(me.username);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (demo) return router.back();
    setLoading(true);
    setError(null);
    try {
      await setProfile({ name, username });
      router.back();
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : 'Não deu para salvar. Tenta de novo.');
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <TopBar
        left={
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
            <Text variant="muted">Cancelar</Text>
          </Pressable>
        }
        title="Editar perfil"
      />
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <Avatar source={me.photo} size={112} state="runner" label="Sua foto" />
        <Pressable accessibilityRole="button" style={{ height: 36, justifyContent: 'center', marginTop: 10 }}>
          <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 14 }}>Trocar foto</Text>
        </Pressable>
      </View>
      <View style={{ gap: 12, marginTop: 10 }}>
        <Field label="Nome" value={name} onChangeText={setName} maxLength={40} />
        <Field
          label="Usuário"
          value={username}
          onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          autoCapitalize="none"
          maxLength={20}
        />
      </View>
      <Text variant="label" style={{ marginTop: 14, marginHorizontal: 6, lineHeight: 18 }}>
        Seu nome e foto aparecem para quem joga com você. O e-mail nunca aparece.
      </Text>
      {error ? <Text variant="error" style={{ marginTop: 10 }}>{error}</Text> : null}
      <Spacer />
      <Button label="Salvar" style={{ marginTop: 24 }} onPress={save} loading={loading} disabled={name.trim().length < 2 || username.length < 3} />
    </Screen>
  );
}
