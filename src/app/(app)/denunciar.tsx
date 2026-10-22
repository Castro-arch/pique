import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Toggle } from '@/components/Controls';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { players } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

const reasons = ['Mensagens ofensivas no Radio', 'Disse que pegou sem pegar', 'Jogou de um jeito perigoso', 'Outra coisa'];

// 7.6 Denunciar jogador (a pessoa denunciada não fica sabendo quem foi).
export default function Denunciar() {
  const { id = 'leo' } = useLocalSearchParams<{ id?: string }>();
  const p = players.find((x) => x.id === id) ?? players[1];
  const [reason, setReason] = useState<string | null>(null);
  const [block, setBlock] = useState(true);
  const [sent, setSent] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <Sheet>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 }}>
          <Avatar source={p.photo} size={48} state={p.role === 'draw' ? 'neutral' : p.role} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 22 }}>Denunciar o {p.name}</Text>
            <Text variant="small">O {p.name} não fica sabendo quem denunciou.</Text>
          </View>
        </View>

        {sent ? (
          <View accessibilityRole="alert" style={styles.sent}>
            <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 15, color: colors.lime }}>Denúncia enviada.</Text>
            <Text variant="small" style={{ marginTop: 4 }}>
              A gente olha em até 24 h.{block ? ` Vocês não caem mais na mesma partida.` : ''}
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
            <View style={styles.block}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: fonts.bodyStrong }}>Bloquear o {p.name} também</Text>
                <Text variant="small" style={{ marginTop: 2 }}>Vocês não caem mais na mesma partida.</Text>
              </View>
              <Toggle label={`Bloquear o ${p.name}`} value={block} onChange={setBlock} />
            </View>
          </>
        )}

        {sent ? (
          <Button label="Fechar" style={{ marginTop: 18 }} onPress={() => router.back()} />
        ) : (
          <>
            <Button variant="danger" label="Enviar denúncia" disabled={!reason} style={{ marginTop: 18 }} onPress={() => setSent(true)} />
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
  block: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  sent: { marginTop: 18, backgroundColor: colors.limeTint, borderRadius: radius.md, padding: 14 },
});
