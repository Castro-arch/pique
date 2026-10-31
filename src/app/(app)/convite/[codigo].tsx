import { useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, AvatarStack } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { CloseButton, Logo } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { match, photos, player } from '@/lib/demo';
import { useDemoMode } from '@/lib/demoMode';
import { useJoinGame } from '@/lib/game';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../../convex/_generated/api';

// 4.1 Convite pelo link (pique.app/p/TACO42 abre aqui)
export default function Convite() {
  const { codigo = match.code } = useLocalSearchParams<{ codigo?: string }>();
  const demo = useDemoMode();
  const real = useQuery(api.games.preview, demo ? 'skip' : { code: codigo });
  const join = useJoinGame();
  const [busy, setBusy] = useState(false);
  const host = demo ? player('leo') : { name: real?.hostName ?? '…', photo: photos.leo };
  const rules = demo ? match.rules : real?.rules;
  const durationMin = rules?.durationMin ?? 0;
  const pingEveryMin = rules?.pingEveryMin ?? 0;
  const zoneMeters = demo ? match.rules.zoneMeters : (real?.zoneMeters ?? '–');
  const count = demo ? 5 : (real?.players ?? 0);

  // Código que não existe volta para a tela de código com o aviso.
  useEffect(() => {
    if (!demo && real === null) router.replace({ pathname: '/entrar', params: { codigo } });
  }, [demo, real, codigo]);

  async function enter() {
    if (demo) return router.replace('/aguardando');
    setBusy(true);
    const r = await join(codigo);
    setBusy(false);
    if (r.ok) router.replace({ pathname: '/aguardando', params: { id: r.gameId } });
    else router.replace({ pathname: '/indisponivel', params: { codigo } });
  }

  return (
    <Screen>
      <View style={styles.head}>
        <Logo size={22} />
        <CloseButton onPress={() => router.replace('/')} />
      </View>
      <View style={{ alignItems: 'center', marginTop: 22 }}>
        <Avatar source={host.photo} size={96} state="runner" label={host.name} />
      </View>
      <Headline style={{ textAlign: 'center', marginTop: 18 }}>{`O ${host.name} te chamou pra jogar`}</Headline>
      <Text variant="muted" style={{ textAlign: 'center', marginTop: 10 }}>Pelo link que ele mandou no grupo.</Text>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text variant="label">Partida</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6 }}>{codigo.toUpperCase()}</Text>
          </View>
          <AvatarStack sources={[photos.priya, photos.sasha, photos.teo]} size={32} extra={2} />
        </View>
        <Text variant="small" style={{ marginTop: 6 }}>{count} {count === 1 ? 'pessoa' : 'pessoas'} no lobby · começa quando o {host.name} quiser</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <Rule label="Rodada" value={durationMin} unit="min" />
          <Rule label="Ping a cada" value={pingEveryMin} unit="min" />
          <Rule label="Zona" value={zoneMeters} unit="m" />
        </View>
      </View>

      <Spacer />
      <Text variant="label" style={{ textAlign: 'center', marginBottom: 10 }}>
        Entrar é grátis. Sua localização só é usada quando a rodada começar.
      </Text>
      <Button label="Entrar na partida" loading={busy} disabled={!demo && !real} onPress={enter} />
      <Button variant="link" label="Agora não" style={{ marginTop: 6 }} onPress={() => router.replace('/')} />
    </Screen>
  );
}

function Rule({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <View style={styles.rule}>
      <Text style={{ fontSize: 11, color: colors.paperMuted }}>{label}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 20 }}>
        {value}
        <Text style={{ fontFamily: fonts.display, fontSize: 12 }}> {unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  card: { marginTop: 22, backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: radius.xl, padding: 16 },
  rule: { flex: 1, backgroundColor: colors.ink, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10 },
});
