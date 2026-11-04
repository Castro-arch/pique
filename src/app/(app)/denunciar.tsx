import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Toggle } from '@/components/Controls';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { players } from '@/lib/demo';
import { errorInfo } from '@/lib/game';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

// Os mesmos motivos que o servidor aceita (convex/reports.ts, REPORT_REASONS).
const reasons = ['Mensagens ofensivas no Radio', 'Disse que pegou sem pegar', 'Jogou de um jeito perigoso', 'Outra coisa'];

// 7.6 Denunciar jogador (a pessoa denunciada não fica sabendo quem foi).
// Com ?gameId&playerId&name é a denúncia de verdade (vem do Rádio); sem, o
// exemplo da galeria de telas.
export default function Denunciar() {
  const { gameId, playerId, id = 'leo' } = useLocalSearchParams<{ gameId?: string; playerId?: string; id?: string }>();
  const real = !!gameId && !!playerId;
  const demo = players.find((x) => x.id === id) ?? players[1];
  // o nome vem do servidor: um link com outro nome não engana ninguém
  const target = useQuery(api.reports.target, real ? { gameId: gameId as Id<'games'>, playerId: playerId as Id<'players'> } : 'skip');
  const name = real ? (target?.name ?? 'jogador') : demo.name;
  const create = useMutation(api.reports.create);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [block, setBlock] = useState(true);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!reason || busy) return;
    if (!real) return setSent(true);
    setBusy(true);
    setError(null);
    try {
      await create({ gameId: gameId as Id<'games'>, playerId: playerId as Id<'players'>, reason, details: details.trim() || undefined, block });
      setSent(true);
    } catch (e) {
      setError(errorInfo(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <Sheet>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 }}>
          <Avatar source={real ? undefined : demo.photo} name={name} size={48} state={real ? 'neutral' : demo.role === 'draw' ? 'neutral' : demo.role} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 22 }}>Denunciar {name}</Text>
            <Text variant="small">{name} não fica sabendo quem denunciou.</Text>
          </View>
        </View>

        {sent ? (
          <View accessibilityRole="alert" style={styles.sent}>
            <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 15, color: colors.lime }}>Denúncia enviada.</Text>
            <Text variant="small" style={{ marginTop: 4 }}>
              A gente olha o quanto antes.{block ? ` Vocês não caem mais na mesma partida e as mensagens de ${name} somem do seu rádio.` : ''}
            </Text>
          </View>
        ) : (
          <>
            <Text variant="label" style={{ marginTop: 18, marginBottom: 8, marginLeft: 6 }}>O que aconteceu?</Text>
            <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
              {reasons.map((r) => {
                const on = reason === r;
                return (
                  <Pressable
                    key={r}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => setReason(r)}
                    style={[styles.reason, on && { borderColor: colors.pink, backgroundColor: colors.pinkTint }]}>
                    <View style={[styles.dot, on && { borderColor: colors.pink, borderWidth: 6 }]} />
                    <Text style={{ fontSize: 15 }}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Quer contar mais? (opcional)"
              placeholderTextColor={colors.inkMuted}
              maxLength={300}
              multiline
              accessibilityLabel="Detalhes da denúncia (opcional)"
              style={styles.details}
            />
            <View style={styles.block}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: fonts.bodyStrong }}>Bloquear {name} também</Text>
                <Text variant="small" style={{ marginTop: 2 }}>Vocês não caem mais na mesma partida. Dá para desfazer nos Ajustes.</Text>
              </View>
              <Toggle label={`Bloquear ${name}`} value={block} onChange={setBlock} />
            </View>
            {error ? <Text variant="error" style={{ marginTop: 10 }}>{error}</Text> : null}
          </>
        )}

        {sent ? (
          <Button label="Fechar" style={{ marginTop: 18 }} onPress={() => router.back()} />
        ) : (
          <>
            <Button variant="danger" label="Enviar denúncia" disabled={!reason} loading={busy} style={{ marginTop: 18 }} onPress={send} />
            <Button variant="link" label="Cancelar" style={{ marginTop: 4 }} onPress={() => router.back()} />
          </>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.inkBorder,
  },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.inkMuted },
  details: { marginTop: 12, minHeight: 64, borderRadius: radius.md, borderWidth: 1, borderColor: colors.inkBorder, backgroundColor: colors.ink, color: colors.paper, padding: 12, fontSize: 15, textAlignVertical: 'top' },
  block: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  sent: { marginTop: 18, backgroundColor: colors.limeTint, borderRadius: radius.md, padding: 14 },
});
