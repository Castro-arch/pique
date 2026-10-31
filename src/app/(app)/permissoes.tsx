import { router } from 'expo-router';
import { useEffect, useState, type ComponentType } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { StepBars } from '@/components/Controls';
import { Bell, Camera, Check, LocateFixed, Lock, Mic } from '@/components/icons';
import { Screen, Spacer } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { markPermissionsSeen } from '@/lib/onboarding';
import {
  canOpenSettings,
  checkPermission,
  deniedHint,
  permissionNotes,
  requestPermission,
  type PermissionId,
  type PermissionState,
} from '@/lib/permissions';
import { colors, fonts, radius } from '@/theme/tokens';

type Item = { id: PermissionId; title: string; why: string; Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }> };

// Na ordem em que o sistema pede: o "o tempo todo" só depois do "durante o uso".
const ITEMS: Item[] = [
  { id: 'location', title: 'Localização', why: 'Para o mapa e os pings. Só durante a rodada.', Icon: LocateFixed },
  { id: 'background', title: 'Localização com a tela bloqueada', why: 'A partida segue com o celular no bolso.', Icon: Lock },
  { id: 'notifications', title: 'Avisos', why: 'Ping, coração acelerado, grito e fim da rodada.', Icon: Bell },
  { id: 'microphone', title: 'Microfone', why: 'Só enquanto você segura o botão de falar no Radio.', Icon: Mic },
  { id: 'camera', title: 'Câmera e fotos', why: 'Para a sua foto no mapa e as fotos do fim da rodada.', Icon: Camera },
];

// Depois do nome: todas as permissões numa tela só, com um botão que pede tudo.
// Quem negar alguma pode seguir; o jogo pede de novo quando precisar.
export default function Permissoes() {
  const [states, setStates] = useState<Partial<Record<PermissionId, PermissionState>>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(ITEMS.map(async (i) => [i.id, await checkPermission(i.id).catch(() => 'undetermined' as const)] as const));
      setStates(Object.fromEntries(entries));
    })();
  }, []);

  const items = ITEMS.filter((i) => states[i.id] !== 'unavailable');
  const pending = items.filter((i) => states[i.id] !== 'granted');
  const allDone = items.length > 0 && pending.length === 0;

  const ask = async (id: PermissionId) => {
    const s = await requestPermission(id).catch(() => 'denied' as const);
    setStates((x) => ({ ...x, [id]: s }));
    return s;
  };
  const askAll = async () => {
    setBusy(true);
    for (const i of pending) {
      // Sem localização durante o uso, o sistema nem mostra o "o tempo todo".
      if (i.id === 'background' && states.location !== 'granted' && (await checkPermission('location')) !== 'granted') continue;
      await ask(i.id);
    }
    setBusy(false);
  };
  const done = async () => {
    await markPermissionsSeen();
    router.replace('/');
  };

  return (
    <Screen>
      <StepBars total={2} current={2} />
      <Headline style={{ marginTop: 22, fontSize: 40, lineHeight: 40 }}>Deixe tudo pronto para jogar</Headline>
      <Text variant="muted" style={{ marginTop: 10 }}>
        Libere agora e não perca o começo da rodada com avisos do sistema. Nada sai do celular fora da partida.
      </Text>

      <View style={{ marginTop: 18, gap: 8 }}>
        {items.map((i) => (
          <Row key={i.id} item={i} state={states[i.id]} onPress={() => ask(i.id)} />
        ))}
      </View>

      <Spacer />
      {allDone ? (
        <Button label="Tudo certo, bora jogar" onPress={done} style={{ marginTop: 16 }} />
      ) : (
        <>
          <Button label="Permitir tudo" loading={busy} onPress={askAll} style={{ marginTop: 16 }} />
          <Button label="Agora não" variant="link" onPress={done} />
        </>
      )}
    </Screen>
  );
}

function Row({ item, state, onPress }: { item: Item; state?: PermissionState; onPress: () => void }) {
  const granted = state === 'granted';
  const denied = state === 'denied';
  const settings = denied && canOpenSettings;
  const note = permissionNotes[item.id];
  return (
    <View style={[styles.row, granted && { borderColor: colors.lime }]}>
      <View style={[styles.icon, granted && { backgroundColor: colors.limeTint }]}>
        <item.Icon size={20} color={granted ? colors.lime : colors.paper} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontFamily: fonts.bodyStrong }}>{item.title}</Text>
        <Text variant="label" style={{ marginTop: 2, lineHeight: 16 }}>
          {denied ? deniedHint : item.why}
        </Text>
        {note && !granted ? (
          <Text variant="label" style={{ marginTop: 2, lineHeight: 16, color: colors.amber }}>
            {note}
          </Text>
        ) : null}
      </View>
      {granted ? (
        <View accessibilityLabel={`${item.title} liberada`} style={styles.ok}>
          <Check size={16} color={colors.limeInk} strokeWidth={3} />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={settings ? `Abrir ajustes para ${item.title}` : `Permitir ${item.title}`}
          onPress={settings ? () => Linking.openSettings().catch(() => {}) : onPress}
          hitSlop={6}
          style={({ pressed }) => [styles.allow, pressed && { opacity: 0.8 }]}>
          <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.ink }}>{settings ? 'Ajustes' : denied ? 'Tentar' : 'Permitir'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
  },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  ok: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  allow: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.paper, justifyContent: 'center' },
});
