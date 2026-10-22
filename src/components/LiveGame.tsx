import { useMutation, useQuery } from 'convex/react';
import { Redirect, router } from 'expo-router';
import { EyeOff, TriangleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Bar, CardAction, GameTabs, Hud, HudClock, HudFoot, HudRunners, Legend, marks, mmss, RadioCard } from '@/components/Game';
import { GameMap } from '@/components/GameMap';
import { ago } from '@/components/gameMapTypes';
import { Text } from '@/components/Text';
import { errorInfo, secondsUntil, useNow, useSendPosition, useView, type GameId } from '@/lib/game';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

// O mapa da partida real. Tudo que aparece aqui vem da query play.view,
// que já aplicou a regra de quem pode ver quem. O mapa em si é o GameMap:
// satélite no celular, desenhado no navegador.
export function LiveGame({ id }: { id: string }) {
  const view = useView(id);
  const radio = useQuery(api.radio.list, { gameId: id as GameId });
  const now = useNow();
  const playing = view?.game.status === 'headstart' || view?.game.status === 'hunt';
  const { denied } = useSendPosition(id, !!playing && view?.me.state === 'active');
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mark = useMutation(api.play.markCapture);

  // Pedido de pega: o corredor recebe a pergunta na hora.
  useEffect(() => {
    if (view?.capture && view.me.role === 'runner' && view.game.status !== 'ended') {
      router.push({ pathname: '/pego', params: { id, captura: view.capture.id } });
    }
  }, [id, view?.capture?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fim da rodada. Redirect só age quando o mapa está em foco, então funciona
  // mesmo se a rodada acabar com outra tela (confirmação, Radio) por cima.
  if (view?.game.status === 'ended') {
    return <Redirect href={{ pathname: '/fim', params: { id, lado: view.game.winner === 'hunter' ? 'cacador' : 'corredor' } }} />;
  }

  if (!view) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text variant="muted">Achando a partida…</Text>
      </View>
    );
  }

  const g = view.game;
  const me = view.me;
  const hunter = me.role === 'hunter';
  const zone = g.zone;
  const headstart = g.status === 'headstart';
  const left = secondsUntil(headstart ? g.headStartEndsAt : g.endsAt, now);
  const ping = secondsUntil(g.nextPingAt, now);
  const pingTotal = g.pingEveryMin * 60;
  const outFor = me.outOfZoneSince ? Math.max(0, 30 - Math.round((now - me.outOfZoneSince) / 1000)) : null;
  const caught = me.state === 'caught';
  const last = radio?.messages[radio.messages.length - 1];
  const runnersToMark = view.people.filter((p) => p.role === 'runner' && p.state === 'active');

  const markRunner = async (runnerId: Id<'players'>) => {
    setError(null);
    try {
      await mark({ gameId: id as GameId, runnerId });
      setPicking(false);
      router.push({ pathname: '/confirmando', params: { id } });
    } catch (e) {
      setError(errorInfo(e).message);
    }
  };

  return (
    <View style={styles.root}>
      <GameMap
        zone={zone}
        nextZoneRadius={g.nextZoneRadius}
        people={view.people}
        now={now}
        hunter={hunter}
        outOfZone={!!me.outOfZoneSince}
        dim={headstart && !hunter ? 0.18 : 0}
      />

      {outFor !== null && !caught ? (
        <View accessibilityRole="alert" style={[styles.hud, styles.amber]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TriangleAlert size={16} color={colors.amberInk} strokeWidth={2.4} />
            <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, letterSpacing: 0.3, color: colors.amberInk }}>VOCÊ SAIU DA ZONA</Text>
          </View>
          {me.exposed ? (
            <Text style={{ fontFamily: fonts.display, fontSize: 24, marginTop: 6, color: colors.amberInk }}>Os caçadores te veem ao vivo. Volte!</Text>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 58, color: colors.amberInk }}>{`0:${String(outFor).padStart(2, '0')}`}</Text>
                <Text style={{ fontSize: 15, lineHeight: 19, fontFamily: fonts.bodyStrong, color: colors.amberInk }}>para voltar antes{'\n'}de aparecer ao vivo</Text>
              </View>
              <Bar value={outFor / 30} color={colors.amberInk} track="rgba(42,26,0,0.2)" style={{ marginTop: 12 }} />
            </>
          )}
        </View>
      ) : (
        <Hud>
          <HudClock
            label={headstart ? (hunter ? 'Vantagem dos corredores' : 'Vantagem') : 'Tempo restante'}
            value={mmss(left)}
            color={headstart && !hunter ? colors.lime : colors.paper}
            sideLabel={headstart ? 'Primeiro ping em' : 'Próximo ping em'}
            sideValue={g.nextPingAt ? mmss(ping) : '–'}
            sideColor={headstart ? colors.paper : colors.lime}
            progress={headstart ? 0 : 1 - ping / pingTotal}
          />
          <HudRunners value={view.runners.total ? view.runners.free / view.runners.total : 0} label={`${view.runners.free} de ${view.runners.total}`} />
          <HudFoot
            badge={caught ? 'Sua posição não é mais enviada' : hunter ? 'Só sua equipe te vê' : 'Ninguém te vê agora'}
            badgeTone={!hunter && !caught ? 'runner' : 'neutral'}
            icon={<EyeOff size={14} color={!hunter && !caught ? colors.lime : colors.paper} />}
            right={g.shrinkAt ? `Zona encolhe em ${mmss(secondsUntil(g.shrinkAt, now))}` : zone ? `Zona ${zone.radius * 2} m` : ''}
          />
        </Hud>
      )}

      <Legend
        items={hunter ? [{ label: 'Corredor (ping)', mark: marks.runner }, { label: 'Caçador', mark: marks.hunter }] : [{ label: 'Corredor', mark: marks.runner }, { label: 'Pego', mark: marks.out }]}
      />

      {picking ? (
        <View style={styles.picker}>
          <Text style={{ fontFamily: fonts.display, fontSize: 20 }}>Quem você pegou?</Text>
          <Text variant="small" style={{ marginTop: 2 }}>Ele recebe um aviso e confirma no celular dele.</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {runnersToMark.length === 0 ? <Text variant="muted">Nenhum corredor apareceu no mapa ainda.</Text> : null}
            {runnersToMark.map((p) => (
              <Pressable key={p.id} accessibilityRole="button" onPress={() => markRunner(p.id)} style={styles.pick}>
                <Avatar name={p.name} size={32} state="runner" />
                <Text style={{ flex: 1, fontSize: 15 }}>{p.name}</Text>
                <Text variant="label">{p.kind === 'ping' ? `ping há ${ago(p.at, now)}` : 'ao vivo'}</Text>
              </Pressable>
            ))}
          </View>
          {error ? <Text variant="error" style={{ marginTop: 8 }}>{error}</Text> : null}
          <CardAction label="Cancelar" onPress={() => setPicking(false)} />
        </View>
      ) : (
        <RadioCard from={last?.from?.name ?? 'Radio'} fromRole={last?.from && hunter ? 'hunter' : 'radio'} text={last?.text ?? (last?.kind === 'audio' ? 'Mandou um áudio.' : 'Tudo quieto por enquanto.')}>
          {denied ? (
            <Text variant="error" style={{ marginTop: 10 }}>Libere a localização para jogar.</Text>
          ) : caught ? (
            <View style={styles.locked}>
              <Text style={{ fontFamily: fonts.display, fontSize: 18 }}>Você foi pego</Text>
              <Text variant="label">Assista até o fim da rodada</Text>
            </View>
          ) : hunter && headstart ? (
            <View style={styles.locked}>
              <Text style={{ fontFamily: fonts.display, fontSize: 18 }}>Os corredores estão se escondendo</Text>
              <Text variant="label">Você é liberado em {mmss(left)}</Text>
            </View>
          ) : hunter ? (
            <CardAction tone="lime" label="Marquei um corredor" hint="ele confirma" onPress={() => setPicking(true)} />
          ) : (
            <CardAction label="Fui pego" hint="sistema de honra" onPress={() => router.push({ pathname: '/pego', params: { id } })} />
          )}
        </RadioCard>
      )}
      <GameTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.inkSunken },
  tag: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: colors.inkRaised },
  hud: { position: 'absolute', left: 16, right: 16, top: 52, borderRadius: radius.xl, padding: 16 },
  amber: { backgroundColor: colors.amber },
  locked: {
    marginTop: 12,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 106,
    backgroundColor: 'rgba(26,32,39,0.98)',
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.xl,
    padding: 16,
  },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.ink },
});
