import { router, useLocalSearchParams } from 'expo-router';
import { Bell, Check } from '@/components/icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, AvatarStack } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Illustration } from '@/components/Illustration';
import { Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { illustrations, photos } from '@/lib/demo';
import { useFollowRound, useLobby, type GameId } from '@/lib/game';
import { colors, fonts, radius } from '@/theme/tokens';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const sideName = { runner: 'corredor', hunter: 'caçador', draw: 'sorteio' } as const;

// 4.7 Aguardando a partida (com a ilustração da crew no poste)
export default function Aguardando() {
  const params = useLocalSearchParams<{ id?: string; lado?: keyof typeof sideName }>();
  const { id } = params;
  const insets = useSafeAreaInsets();
  const lobby = useLobby(id);
  const setReadyOnServer = useMutation(api.games.setReady);
  const [localReady, setLocalReady] = useState(false);
  const [dots, setDots] = useState(1);
  useFollowRound(id, lobby?.status);

  const lado = lobby?.me.side ?? params.lado ?? 'runner';
  const ready = lobby ? lobby.me.ready : localReady;
  const host = lobby?.players.find((p) => p.isHost)?.name ?? 'Leo';
  const total = lobby?.players.length ?? 6;
  const readyCount = lobby ? lobby.players.filter((p) => p.ready).length : ready ? 6 : 5;
  const waiting = lobby?.players.find((p) => !p.ready && !p.isMe)?.name ?? (lobby ? null : 'Teo');
  const status = waiting
    ? `${waiting} está se preparando${'.'.repeat(dots)}`
    : !ready
      ? 'Só falta você.'
      : 'Todo mundo pronto.';
  const toggleReady = (v: boolean) => (id ? setReadyOnServer({ gameId: id as GameId, ready: v }) : setLocalReady(v));

  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d % 3) + 1), 500);
    return () => clearInterval(t);
  }, []);

  const color = lado === 'hunter' ? colors.pink : lado === 'draw' ? colors.paper : colors.lime;

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 34) }]}>
      <View style={{ marginTop: Math.max(insets.top, 30) }}>
        <Illustration
          source={illustrations.aguardando}
          height={300}
          background={colors.inkNight}
          focusX={0.46}
          label="Ilustração: a crew reunida embaixo de um poste, rindo e olhando o celular antes da partida"
        />
      </View>
      <View style={styles.body}>
        <Chip label={`${lobby?.code ?? 'TACO42'} · lobby de ${host}`} dot={colors.lime} style={{ alignSelf: 'flex-start', marginBottom: 14 }} />
        <Headline variant="display" style={{ fontSize: 48, lineHeight: 46 }}>Você tá dentro</Headline>
        <Text variant="muted" style={{ marginTop: 12, fontSize: 16 }}>
          Agora é esperar {lobby?.isHost ? 'você mesmo' : host} começar. Você vai como{' '}
          <Text style={{ color, fontFamily: fonts.bodyStrong, fontSize: 16 }}>{sideName[lado] ?? 'corredor'}</Text>. Aproveita para se alongar.
        </Text>

        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {lobby ? (
              <View style={{ flexDirection: 'row' }}>
                {lobby.players.slice(0, 6).map((p, i) => (
                  <Avatar
                    key={p.id}
                    name={p.name}
                    size={32}
                    state={p.ready ? 'runner' : 'draw'}
                    style={{ marginLeft: i === 0 ? 0 : -8 }}
                  />
                ))}
              </View>
            ) : (
              <AvatarStack sources={[photos.leo, photos.castro, photos.priya, photos.sasha, photos.jonah]} size={32} extra={0} />
            )}
            <Text style={{ fontFamily: fonts.display, fontSize: 18 }}>
              {readyCount}
              <Text style={{ color: colors.paperMuted, fontSize: 14 }}> de {total} prontos</Text>
            </Text>
          </View>
          <Text variant="small" style={{ marginTop: 10 }} accessibilityLiveRegion="polite">
            {status}
          </Text>
        </View>

        <Spacer />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Bell size={16} color={colors.paperMuted} />
          <Text variant="label">Pode bloquear o celular. A gente vibra quando começar.</Text>
        </View>
        {lobby?.isHost ? (
          <Button label="Ir para o lobby" onPress={() => router.replace({ pathname: '/lobby', params: { id: id! } })} />
        ) : ready ? (
          <Button
            variant="secondary"
            label={`Pronto · esperando o ${host}`}
            onPress={() => (id ? toggleReady(false) : router.push('/sorteio'))}
          />
        ) : (
          <Button label="Estou pronto" icon={<Check size={18} color={colors.limeInk} strokeWidth={3} />} onPress={() => toggleReady(true)} />
        )}
        <Button
          variant="link"
          label="Trocar de lado"
          style={{ marginTop: 6 }}
          onPress={() => router.replace(id ? { pathname: '/lado', params: { id } } : '/lado')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.inkNight },
  body: { flex: 1, paddingHorizontal: 20, marginTop: -10 },
  card: { marginTop: 18, backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 14 },
});
