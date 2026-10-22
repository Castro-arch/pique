import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { BackButton } from '@/components/Nav';
import { RoleTag, SidePicker, type Side } from '@/components/RoleTag';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { match, players } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

// 5.2 Lobby · jogadores (toque num jogador para ver o perfil dele)
export default function Jogadores() {
  const [side, setSide] = useState<Side>('runner');
  return (
    <Screen scroll>
      <View style={styles.head}>
        <BackButton label="Lobby" />
        <Text variant="small">{match.code}</Text>
      </View>
      <Headline style={{ marginTop: 12 }}>Quem joga</Headline>
      <Text variant="muted" style={{ fontSize: 14, marginTop: 6 }}>6 jogadores · todos prontos</Text>

      <Text variant="small" style={{ marginTop: 16, marginBottom: 8 }}>Você joga como</Text>
      <SidePicker value={side} onChange={setSide} />
      <Text variant="label" style={{ marginTop: 8 }}>Com 6 jogadores: 1 a 3 caçadores. O sorteio completa o time que precisar.</Text>

      <View style={styles.list}>
        {players.map((p, i) => {
          const mine = p.id === 'castro';
          const s = mine ? side : p.role;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${s}`}
              disabled={mine}
              onPress={() => router.push({ pathname: '/jogador/[id]', params: { id: p.id } })}
              style={[styles.row, i < players.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.inkBorder }]}>
              <Avatar source={p.photo} size={38} state={s} />
              <Text style={{ fontSize: 16, fontFamily: fonts.bodyMedium }}>{p.name}</Text>
              {mine ? <Chip label="Você · Anfitrião" tone="runner" style={{ paddingVertical: 3 }} /> : null}
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <RoleTag side={s} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <Spacer />
      <Button label="Começar partida · 6 prontos" style={{ marginTop: 20 }} onPress={() => router.push('/sorteio')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  list: { marginTop: 16, backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: 22, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, paddingHorizontal: 16 },
});
