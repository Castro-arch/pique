import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ListGroup } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

// Ajustes → Jogadores bloqueados: quem você bloqueou (na denúncia) e o
// desbloquear. Bloqueado não cai na mesma partida, não manda pedido de amizade
// e some do seu rádio.
export default function Bloqueados() {
  const list = useQuery(api.reports.blocked, {});
  const unblock = useMutation(api.reports.unblock);
  const [busy, setBusy] = useState<string | null>(null);

  const undo = async (userId: Id<'users'>) => {
    setBusy(userId);
    try {
      await unblock({ userId });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.head}>
        <Text variant="h2" accessibilityRole="header">Bloqueados</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 15 }}>Concluir</Text>
        </Pressable>
      </View>
      <Text variant="muted" style={{ marginTop: 6, marginBottom: 16 }}>
        Quem está aqui não cai na mesma partida que você, não te manda pedido de amizade e não aparece no seu rádio. A pessoa não fica sabendo.
      </Text>
      {list === undefined ? null : list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 15 }}>Ninguém bloqueado.</Text>
          <Text variant="small" style={{ marginTop: 4 }}>Para bloquear alguém, segure uma mensagem dele no Rádio e escolha denunciar.</Text>
        </View>
      ) : (
        <ListGroup>
          {list.map((b, i) => (
            <View key={b.userId} style={[styles.row, i < list.length - 1 && styles.sep]}>
              <Avatar name={b.name} size={36} state="neutral" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: fonts.bodyStrong }}>{b.name}</Text>
                {b.username ? <Text variant="small">@{b.username}</Text> : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Desbloquear ${b.name}`} disabled={busy === b.userId} onPress={() => undo(b.userId)} style={styles.btn}>
                <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong, color: colors.lime }}>{busy === b.userId ? '…' : 'Desbloquear'}</Text>
              </Pressable>
            </View>
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: 18, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  sep: { borderBottomWidth: 1, borderBottomColor: colors.inkBorder },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.inkBorder },
});
