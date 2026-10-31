import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, CirclePlus, Copy, Info, QrCode } from '@/components/icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { CodeInput } from '@/components/CodeInput';
import { BackButton } from '@/components/Nav';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { match } from '@/lib/demo';
import { useDemoMode } from '@/lib/demoMode';
import { useCreateGame, useJoinGame } from '@/lib/game';
import { colors, fonts, radius } from '@/theme/tokens';

const CODE = /^[A-Z0-9]{6}$/;

// 4.2 Entrar com código e 4.3 Código errado.
// No modo demonstração só TACO42 existe e BOLA77 simula partida em andamento.
export default function Entrar() {
  const params = useLocalSearchParams<{ codigo?: string }>();
  const demo = useDemoMode();
  const join = useJoinGame();
  const create = useCreateGame();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(params.codigo ?? '');
  const [wrong, setWrong] = useState<string | null>(params.codigo && params.codigo !== match.code ? params.codigo : null);
  const [clip, setClip] = useState<string | null>(null);

  // Sugere o código que a pessoa acabou de copiar do grupo.
  useEffect(() => {
    Clipboard.getStringAsync()
      .then((t) => {
        const c = t.trim().toUpperCase();
        setClip(CODE.test(c) ? c : demo ? match.code : null);
      })
      .catch(() => setClip(demo ? match.code : null));
  }, [demo]);

  async function submit(c = code) {
    if (!demo) {
      setBusy(true);
      const r = await join(c);
      setBusy(false);
      if (r.ok) return router.replace({ pathname: '/aguardando', params: { id: r.gameId } });
      if (r.code === 'IN_PROGRESS' || r.code === 'FULL') return router.replace({ pathname: '/indisponivel', params: { codigo: c } });
      return setWrong(c);
    }
    if (c === match.code) return router.replace({ pathname: '/convite/[codigo]', params: { codigo: c } });
    if (c === 'BOLA77') return router.replace('/indisponivel');
    setWrong(c);
  }

  const missing = 6 - code.length;

  return (
    <Screen>
      <BackButton />
      <Headline mark="?" style={{ marginTop: 14 }}>Qual é o código</Headline>
      <Text variant="muted" style={{ marginTop: 10 }}>6 letras ou números, sem diferença entre maiúsculas.</Text>

      <View style={{ marginTop: 20 }}>
        <CodeInput
          label="Código da partida"
          kind="alphanumeric"
          value={code}
          invalid={!!wrong}
          autoFocus={!wrong}
          onChange={(v) => {
            setWrong(null);
            setCode(v);
            if (v.length === 6) submit(v);
          }}
        />
      </View>

      {wrong ? (
        <>
          <View accessibilityRole="alert" style={styles.error}>
            <Info size={18} color={colors.amber} strokeWidth={2.2} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 15 }}>
                Nenhuma partida com o código <Text style={{ fontFamily: fonts.display, color: colors.amber }}>{wrong}</Text>
              </Text>
              <Text variant="small" style={{ marginTop: 4 }}>
                A partida pode ter acabado ou o código está diferente. Confira com o anfitrião: ele aparece no topo do lobby.
              </Text>
            </View>
          </View>
          <Text style={styles.kicker}>O QUE FAZER</Text>
          <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: colors.inkBorder }}>
            <Option icon={<QrCode size={20} color={colors.lime} />} label="Escanear o QR do lobby" onPress={() => router.push('/entrar/qr')} />
            <Option icon={<CirclePlus size={20} color={colors.lime} />} label="Criar uma partida sua" onPress={() => (demo ? router.replace('/lobby') : create.run())} />
          </View>
          <Spacer />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button variant="secondary" label="Limpar" style={{ flex: 1 }} onPress={() => { setCode(''); setWrong(null); }} />
            <Button label="Tentar de novo" style={{ flex: 1.4 }} onPress={() => { setCode(''); setWrong(null); }} />
          </View>
        </>
      ) : (
        <>
          {clip && code.length === 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Usar o código copiado ${clip}`} onPress={() => { setCode(clip); submit(clip); }} style={styles.clip}>
              <Copy size={18} color={colors.paperMuted} />
              <Text variant="small" style={{ flex: 1 }}>Copiado agora há pouco</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 16, letterSpacing: 0.6 }}>{clip}</Text>
              <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 13, marginLeft: 4 }}>Usar</Text>
            </Pressable>
          ) : null}
          <Button
            label={missing > 0 ? `Entrar · faltam ${missing}` : 'Entrar'}
            disabled={missing > 0}
            loading={busy}
            style={{ marginTop: 14 }}
            onPress={() => submit()}
          />
          <Button variant="link" label="Escanear QR do lobby" style={{ marginTop: 4 }} onPress={() => router.push('/entrar/qr')} />
        </>
      )}
    </Screen>
  );
}

function Option({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.option}>
      {icon}
      <Text style={{ flex: 1, fontSize: 15, fontFamily: fonts.bodyMedium }}>{label}</Text>
      <ChevronRight size={16} color={colors.paperMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  error: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    backgroundColor: 'rgba(255,176,32,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,176,32,0.35)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  kicker: { fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 0.7, color: colors.paperMuted, marginTop: 24 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, borderBottomWidth: 1, borderBottomColor: colors.inkBorder },
  clip: {
    marginTop: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.md + 2,
    paddingHorizontal: 14,
  },
});
