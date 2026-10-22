import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, EyeOff, Lock, LogOut, Radio as RadioIcon, TriangleAlert, Vibrate, WifiOff } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Bar,
  CardAction,
  GameTabs,
  Hud,
  HudClock,
  HudFoot,
  HudRunners,
  Legend,
  marks,
  mmss,
  Person,
  RadioCard,
  useCountdown,
} from '@/components/Game';
import { Avatar } from '@/components/Avatar';
import { MapBackdrop } from '@/components/MapBackdrop';
import { Text } from '@/components/Text';
import { match, photos } from '@/lib/demo';
import { colors, fonts, radius } from '@/theme/tokens';

export type Estado =
  | 'cacador-espera'
  | 'cacador-caca'
  | 'corredor-vantagem'
  | 'corredor-caca'
  | 'ping'
  | 'fora-zona'
  | 'zona-encolhe'
  | 'sem-sinal';

const ZONE = { cx: 195, cy: 440, r: 190 };

// Linha 6 · O mapa da partida. Um estado por vez, escolhido pelo parâmetro
// ?estado=. Quando o jogo existir no servidor, o estado vem da query de
// visibilidade do Convex em vez da URL.
export default function Jogo() {
  const { estado = 'corredor-vantagem' } = useLocalSearchParams<{ estado?: Estado; treino?: string }>();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 34);

  const screens: Record<Estado, () => React.ReactNode> = {
    'cacador-espera': () => <CacadorEspera />,
    'cacador-caca': () => <CacadorCaca />,
    'corredor-vantagem': () => <CorredorVantagem />,
    'corredor-caca': () => <CorredorCaca />,
    ping: () => <Ping bottom={bottom} />,
    'fora-zona': () => <ForaZona />,
    'zona-encolhe': () => <ZonaEncolhe />,
    'sem-sinal': () => <SemSinal bottom={bottom} />,
  };

  return <View style={styles.root}>{(screens[estado] ?? screens['corredor-vantagem'])()}</View>;
}

// 6.1 Caçador esperando a vantagem acabar
function CacadorEspera() {
  const left = useCountdown(60);
  useEffect(() => {
    if (left === 0) router.setParams({ estado: 'cacador-caca' });
  }, [left]);
  return (
    <>
      <MapBackdrop zone={ZONE} />
      <Person x={89} y={561} photo={photos.leo} state="hunter" tag="Leo" />
      <Person x={166} y={418} photo={photos.castro} state="hunter" tag="Você" me />
      <Hud>
        <HudClock label="Vantagem dos corredores" value={mmss(left)} sideLabel="Primeiro ping em" sideValue={mmss(left + 120)} />
        <HudRunners value={1} label="4 de 4" />
        <HudFoot badge="Só sua equipe te vê" icon={<EyeOff size={14} color={colors.paper} />} right={`Zona ${match.rules.zoneMeters} m`} />
      </Hud>
      <Legend items={[{ label: 'Corredor', mark: marks.runner }, { label: 'Caçador', mark: marks.hunter }]} />
      <RadioCard from="Leo" fromRole="hunter" text="Vou pegar o campinho, você pega a rua Figueira.">
        <View style={styles.locked} accessibilityRole="text">
          <Text style={{ fontFamily: fonts.display, fontSize: 18 }}>Os corredores estão se escondendo</Text>
          <Text variant="label">Você é liberado em {mmss(left)}</Text>
        </View>
      </RadioCard>
      <GameTabs unread={2} />
    </>
  );
}

// 6.2 Caçador na caça (depois de um ping)
function CacadorCaca() {
  const left = useCountdown(29 * 60 + 7);
  const ping = useCountdown(67);
  return (
    <>
      <MapBackdrop zone={ZONE} />
      <Person x={222} y={356} photo={photos.sasha} state="runner" tag="Sasha · 0:48" />
      <Person x={84} y={478} photo={photos.teo} state="runner" tag="Teo · 0:48" />
      <Person x={216} y={492} photo={photos.priya} state="runner" tag="Priya · 0:48" />
      <Person x={154} y={399} photo={photos.jonah} state="runner" tag="Jonah · 0:48" />
      <Person x={89} y={561} photo={photos.leo} state="hunter" tag="Leo" />
      <Person x={186} y={452} photo={photos.castro} state="hunter" tag="Você" me />
      <Hud>
        <HudClock
          label="Tempo restante"
          value={mmss(left)}
          sideLabel="Próximo ping em"
          sideValue={mmss(ping)}
          sideColor={colors.lime}
          progress={1 - ping / (match.rules.pingEveryMin * 60)}
        />
        <HudRunners value={1} label="faltam 4" />
        <HudFoot badge="Só sua equipe te vê" icon={<EyeOff size={14} color={colors.paper} />} right="Zona encolhe em 3:10" />
      </Hud>
      <Legend items={[{ label: 'Corredor (ping)', mark: marks.runner }, { label: 'Caçador', mark: marks.hunter }]} />
      <RadioCard from="Radio" text="Ping! 4 corredores acenderam no mapa.">
        <CardAction tone="lime" label="Marquei um corredor" hint="ele confirma" onPress={() => router.push('/confirmando')} />
      </RadioCard>
      <GameTabs unread={1} />
    </>
  );
}

// 6.3 Corredor na vantagem (ninguém te vê)
function CorredorVantagem() {
  const left = useCountdown(177);
  return (
    <>
      <MapBackdrop zone={ZONE} dim={0.18} />
      <Person x={227} y={343} photo={photos.sasha} state="runner" tag="Sasha · ao vivo" />
      <Person x={118} y={380} photo={photos.jonah} state="runner" tag="Jonah · ao vivo" />
      <Person x={70} y={500} photo={photos.teo} state="runner" tag="Teo · ao vivo" />
      <Person x={227} y={495} photo={photos.priya} state="runner" tag="Priya · ao vivo" />
      <Person x={170} y={425} photo={photos.castro} state="runner" tag="Você" me />
      <Hud>
        <HudClock label="Vantagem" value={mmss(left)} color={colors.lime} sideLabel="Primeiro ping em" sideValue={mmss(left + 120)} />
        <HudRunners value={1} label="5 de 5" />
        <HudFoot badge="Ninguém te vê agora" badgeTone="runner" icon={<EyeOff size={14} color={colors.lime} />} right={`Zona ${match.rules.zoneMeters} m`} />
      </Hud>
      <Legend items={[{ label: 'Corredor', mark: marks.runner }, { label: 'Pego', mark: marks.out }]} />
      <RadioCard from="Radio" text={`Você tem ${match.rules.headStartMin} min de vantagem. Vá se esconder!`}>
        <CardAction label="Fui pego" hint="sistema de honra" onPress={() => router.push('/pego')} />
      </RadioCard>
      <GameTabs />
    </>
  );
}

// 6.4 Corredor na caça (um colega já foi pego)
function CorredorCaca() {
  const left = useCountdown(29 * 60 + 11);
  const ping = useCountdown(71);
  return (
    <>
      <MapBackdrop zone={ZONE} />
      <Person x={197} y={313} photo={photos.teo} state="runner" tag="Teo · ao vivo" />
      <Person x={63} y={467} photo={photos.priya} state="runner" tag="Priya · ao vivo" />
      <Person x={161} y={537} photo={photos.sasha} state="runner" tag="Sasha · ao vivo" />
      <Person x={100} y={380} photo={photos.jonah} state="out" tag="Jonah · pego" />
      <Person x={170} y={425} photo={photos.castro} state="runner" tag="Você" me />
      <Hud>
        <HudClock
          label="Tempo restante"
          value={mmss(left)}
          sideLabel="Ping em"
          sideValue={mmss(ping)}
          sideColor={colors.lime}
          progress={1 - ping / (match.rules.pingEveryMin * 60)}
        />
        <HudRunners value={0.8} label="4 de 5" />
        <HudFoot badge="Ninguém te vê agora" badgeTone="runner" icon={<EyeOff size={14} color={colors.lime} />} right={`Zona ${match.rules.zoneMeters} m`} />
      </Hud>
      <Legend items={[{ label: 'Corredor', mark: marks.runner }, { label: 'Pego', mark: marks.out }]} />
      <RadioCard from="Radio" text="Leo pegou o Jonah. Restam 4 corredores.">
        <CardAction label="Fui pego" hint="sistema de honra" onPress={() => router.push('/pego')} />
      </RadioCard>
      <GameTabs unread={5} />
    </>
  );
}

// 6.5 Ping: sua posição acabou de ir para os caçadores
function Ping({ bottom }: { bottom: number }) {
  const next = useCountdown(120);
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, []);
  return (
    <>
      <MapBackdrop zone={ZONE} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(200,242,60,0.06)' }]} />
      <Person x={171} y={446} photo={photos.castro} state="runner" me />
      <View style={styles.pingTop}>
        <View style={[styles.flag, { backgroundColor: colors.pink }]}>
          <RadioIcon size={14} color={colors.pinkInk} />
          <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.pinkInk }}>Os caçadores te veem agora</Text>
        </View>
        <View style={[styles.flag, { backgroundColor: 'rgba(16,20,24,0.9)', borderWidth: 1, borderColor: colors.inkBorder }]}>
          <Vibrate size={14} color={colors.paperMuted} />
          <Text variant="label">Vibrou</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', left: 20, right: 20, top: 118 }} accessibilityRole="alert">
        <Text style={{ fontFamily: fonts.display, fontSize: 96, lineHeight: 90, letterSpacing: -5.5, color: colors.lime }}>
          Ping<Text style={{ fontFamily: fonts.display, fontSize: 96, color: colors.paper }}>.</Text>
        </Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 27, letterSpacing: -0.7, marginTop: 10 }}>
          Sua posição foi enviada.{'\n'}Se mexa.
        </Text>
      </View>
      <View style={[styles.panel, { bottom }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text variant="label">Próximo ping em</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 42 }}>{mmss(next)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="label">Tempo restante</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 24 }}>24:11</Text>
          </View>
        </View>
        <Bar value={1 - next / 120} style={{ marginTop: 10 }} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <SmallBtn label="Fui pego" onPress={() => router.push('/pego')} />
          <SmallBtn label="Preciso sair" icon={<LogOut size={16} color={colors.paper} />} onPress={() => router.push('/sair')} />
        </View>
        <Text variant="label" style={{ textAlign: 'center', marginTop: 10 }}>
          Preciso sair encerra seu jogo e avisa a crew, sem penalidade.
        </Text>
      </View>
    </>
  );
}

function SmallBtn({ label, icon, onPress }: { label: string; icon?: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.smallBtn}>
      {icon}
      <Text style={{ fontSize: 14, fontFamily: fonts.bodyStrong }}>{label}</Text>
    </Pressable>
  );
}

// 6.6 Fora da zona: 30 s para voltar antes de aparecer ao vivo
function ForaZona() {
  const left = useCountdown(18);
  return (
    <>
      <MapBackdrop zone={{ cx: 195, cy: 470, r: 170 }} />
      <Person x={298} y={306} photo={photos.castro} state="warning" me />
      <View style={{ position: 'absolute', left: 236, top: 358 }}>
        <View style={[styles.flag, { backgroundColor: colors.amber, paddingVertical: 4 }]}>
          <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, color: colors.amberInk }}>Você · 60 m fora</Text>
        </View>
      </View>
      <View accessibilityRole="alert" style={[styles.hud, { backgroundColor: colors.amber, borderWidth: 0, padding: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TriangleAlert size={16} color={colors.amberInk} strokeWidth={2.4} />
          <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, letterSpacing: 0.3, color: colors.amberInk }}>VOCÊ SAIU DA ZONA</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 58, letterSpacing: -2, color: colors.amberInk }}>
            {`0:${String(left).padStart(2, '0')}`}
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 19, fontFamily: fonts.bodyStrong, color: colors.amberInk }}>
            para voltar antes{'\n'}de aparecer ao vivo
          </Text>
        </View>
        <Bar value={left / 30} color={colors.amberInk} track="rgba(42,26,0,0.2)" style={{ marginTop: 12 }} />
      </View>
      <View style={[styles.radioCard]}>
        <Text style={{ fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4 }}>Volte uns 60 m para o sudoeste</Text>
        <Text variant="small" style={{ marginTop: 4 }}>
          Fora da zona por mais de 30 s, os caçadores passam a te ver ao vivo até você voltar.
        </Text>
        <CardAction tone="amber" label="Mostrar caminho de volta" />
      </View>
      <GameTabs />
    </>
  );
}

// 6.7 A zona vai encolher em 1 min
function ZonaEncolhe() {
  const left = useCountdown(58);
  return (
    <>
      <MapBackdrop zone={{ cx: 195, cy: 470, r: 230 }} shrinkTo={160} />
      <Person x={200} y={470} photo={photos.castro} state="runner" tag="Você" me />
      <Hud style={{ padding: 16 }}>
        <Text variant="label">A zona encolhe em</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 46, lineHeight: 48, letterSpacing: -1.4, color: colors.amber }}>{mmss(left)}</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, paddingBottom: 4 }}>
            {match.rules.zoneMeters} m <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.paperMuted }}>→</Text> 300 m
          </Text>
        </View>
        <View style={[styles.inside]}>
          <Check size={16} color={colors.lime} strokeWidth={2.6} />
          <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.lime }}>Você já está dentro da nova zona</Text>
        </View>
      </Hud>
      <Legend top={234} items={[{ label: 'Nova zona', mark: marks.newZone }, { label: 'Sai do jogo', mark: marks.leaving }]} />
      <RadioCard from="Radio" text="A área em amarelo deixa de valer em 1 min. Quem estiver nela tem 30 s para entrar.">
        <CardAction label="Fui pego" hint="sistema de honra" onPress={() => router.push('/pego')} />
      </RadioCard>
      <GameTabs />
    </>
  );
}

// 6.8 Sem sinal: o tempo não para
function SemSinal({ bottom }: { bottom: number }) {
  const tips = [
    'Seu ping sai assim que o sinal voltar, com a posição de agora.',
    'A crew vê “sem sinal” no seu nome, não um sumiço.',
    'Sem sinal por 3 min, o anfitrião decide se você continua.',
  ];
  return (
    <>
      <MapBackdrop zone={ZONE} grayscale />
      <MapPinLast />
      <View accessibilityRole="alert" style={[styles.hud, { padding: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.wifi}>
            <WifiOff size={22} color={colors.paper} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4 }}>Sem sinal. Reconectando…</Text>
            <Text variant="small" style={{ marginTop: 2 }}>Continue jogando. O tempo não para.</Text>
          </View>
        </View>
      </View>
      <View style={[styles.panel, { bottom, padding: 16 }]}>
        <Text style={{ fontSize: 15, fontFamily: fonts.bodyStrong }}>O que acontece enquanto isso</Text>
        <View style={{ gap: 10, marginTop: 12 }}>
          {tips.map((t, i) => (
            <View key={t} style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong }}>{i + 1}</Text>
              <Text variant="muted" style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{t}</Text>
            </View>
          ))}
        </View>
        <View style={styles.gps}>
          <Text variant="small">GPS</Text>
          <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong }}>fraco · precisão de 60 m</Text>
        </View>
      </View>
    </>
  );
}

function MapPinLast() {
  return (
    <View style={{ position: 'absolute', left: '44%', top: '50.6%', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ opacity: 0.6 }}>
        <Avatar source={photos.castro} size={46} state="out" />
      </View>
      <View style={[styles.flag, { backgroundColor: colors.inkBorder, paddingVertical: 4 }]}>
        <Lock size={12} color={colors.paperMuted} />
        <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong }}>Última posição · 0:40</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.inkSunken },
  hud: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 52,
    backgroundColor: 'rgba(16,20,24,0.95)',
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.xl,
  },
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
  pingTop: { position: 'absolute', left: 16, right: 16, top: 56, flexDirection: 'row', justifyContent: 'space-between' },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  panel: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(26,32,39,0.96)',
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: 28,
    padding: 16,
  },
  smallBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  radioCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 106,
    backgroundColor: 'rgba(26,32,39,0.96)',
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.xl,
    padding: 16,
  },
  inside: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.inkBorder },
  wifi: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.inkBorder, alignItems: 'center', justifyContent: 'center' },
  gps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.inkBorder,
  },
});
