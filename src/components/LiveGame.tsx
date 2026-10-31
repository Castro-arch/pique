import { useMutation, useQuery } from 'convex/react';
import { Redirect, router } from 'expo-router';
import { Hand, Lock, Megaphone, TriangleAlert } from '@/components/icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ArcHud } from '@/components/ArcHud';
import { BOOSTS, BoostSlots, RevealAlert, type BoostKind } from '@/components/Boosts';
import { Bar, CardAction, GameTabs, mmss, useDock } from '@/components/Game';
import { GameMap } from '@/components/GameMap';
import { HeartbeatCard, HeartbeatVignette } from '@/components/Heartbeat';
import { GO_MS, HuntGo, HunterLocked } from '@/components/HunterWait';
import { Appear, Pressy } from '@/components/Motion';
import { RadioBubble, useRadioPeek } from '@/components/RadioBubble';
import { ago } from '@/components/gameMapTypes';
import { Text } from '@/components/Text';
import { errorInfo, secondsUntil, useNow, useSendPosition, useView, type GameId } from '@/lib/game';
import { useGameAlerts } from '@/lib/gameAlerts';
import { useHeading } from '@/lib/heading';
import { useHeartbeat } from '@/lib/heartbeat';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

// O mapa da partida real. Tudo que aparece aqui vem da query play.view,
// que já aplicou a regra de quem pode ver quem. O mapa em si é o GameMap:
// satélite no celular, desenhado no navegador.
export function LiveGame({ id }: { id: string }) {
  const view = useView(id);
  const { card } = useDock();
  const radio = useQuery(api.radio.list, { gameId: id as GameId });
  const now = useNow();
  const playing = view?.game.status === 'headstart' || view?.game.status === 'hunt';
  const { denied } = useSendPosition(id, !!playing && view?.me.state === 'active');
  useSendHeading(id, !!playing && view?.me.state === 'active');
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mark = useMutation(api.play.markCapture);
  const shout = useMutation(api.play.shout);
  const [shouting, setShouting] = useState(false);
  const [shoutNote, setShoutNote] = useState<string | null>(null);
  const spendBoost = useMutation(api.play.useBoost);
  const sendQuick = useMutation(api.radio.sendQuick);
  const [justWatch, setJustWatch] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const [using, setUsing] = useState<{ id: string; kind: BoostKind } | null>(null);
  const radioPeek = useRadioPeek(radio?.messages, view ? boostLineFor(view.me, now) : null, view ? boostKeyFor(view.me, now) : null, view?.me.role === 'hunter');

  // 10.4 Coração acelerado: caçador a menos de 30 m. Vibra no ritmo tum-tum.
  const beating = !!view && view.game.status === 'hunt' && view.me.role === 'runner' && view.me.state === 'active' && view.me.heartbeat;
  const pulse = useHeartbeat(beating);
  // Avisos da partida com o app em segundo plano (no site, via push).
  useGameAlerts(id);

  // 14.2: a vantagem acabou e eu caço: "Vai!" por alguns segundos antes do mapa.
  const [goUntil, setGoUntil] = useState(0);
  const lastStatus = useRef(view?.game.status);
  useEffect(() => {
    const st = view?.game.status;
    if (lastStatus.current === 'headstart' && st === 'hunt' && view?.me.role === 'hunter') setGoUntil(Date.now() + GO_MS);
    lastStatus.current = st;
  }, [view?.game.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Saiu da prisão: na próxima vez o "Me salva!" e o "Só assistir" voltam.
  useEffect(() => {
    if (view && !view.me.jailed) {
      setJustWatch(false);
      setHelpSent(false);
    }
  }, [view?.me.jailed]); // eslint-disable-line react-hooks/exhaustive-deps

  // 10.6 Um caçador gritou perto de mim: abre a tela que toca o som.
  // Só vale grito recente (quem abre o app depois não ouve grito velho).
  const heardShout = useRef<number | null>(null);
  useEffect(() => {
    const at = view?.me.shoutedAt;
    if (!at || at === heardShout.current || view.game.status !== 'hunt') return;
    heardShout.current = at;
    if (Date.now() - at < 20_000) router.push({ pathname: '/grito', params: { id } });
  }, [id, view?.me.shoutedAt]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Você não está mais nesta partida (saiu por outro aparelho, por exemplo).
  if (view === null) return <Redirect href="/" />;

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
  // 14.1: durante a vantagem o caçador não vê o mapa, só a contagem.
  if (hunter && headstart && !caught) {
    const mates = view.people.filter((p) => p.role === 'hunter' && !p.isMe).map((p) => p.name);
    return <HunterLocked id={id} left={left} total={g.headStartMin * 60} code={g.code} round={g.round} mates={mates} />;
  }
  if (hunter && goUntil > now) return <HuntGo code={g.code} endsIn={mmss(left)} />;

  const runnersToMark = view.people.filter((p) => p.role === 'runner' && p.state === 'active');

  const shoutsLeft = me.shoutsLeft ?? 0;
  const doShout = async () => {
    setShoutNote(null);
    try {
      const r = await shout({ gameId: id as GameId });
      setShoutNote(r.hit ? 'Gritou! Escute de onde vem o som.' : 'Ninguém a 60 m de você. O grito não gastou.');
      if (r.hit) setShouting(false);
    } catch (e) {
      setShoutNote(errorInfo(e).message);
    }
  };

  // Muda a situação (liberado, pego, preso...): os botões de baixo entram de novo.
  const actionsKey = denied ? 'gps' : me.jailed && !justWatch ? 'preso' : caught ? 'pego' : headstart ? (hunter ? 'espera' : 'vantagem') : hunter ? 'caca' : 'corre';
  const runnerPlaying = !hunter && !caught && (g.status === 'hunt' || headstart) && g.features.boosts;
  const revealed = me.revealUntil && me.revealUntil > now ? me.revealUntil : null;
  // Algum aviso (fora da zona, preso, preço do boost, coração) ocupa o lugar do placar.
  const coveredHud = (outFor !== null && !caught) || (me.jailed && !justWatch) || (!!revealed && !caught) || beating;
  const confirmBoost = async () => {
    if (!using) return;
    setError(null);
    try {
      await spendBoost({ boostId: using.id as Id<'boosts'> });
      setUsing(null);
    } catch (e) {
      setError(errorInfo(e).message);
    }
  };

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
        boosts={view.boosts}
      />
      {beating ? <HeartbeatVignette pulse={pulse} /> : null}

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
      ) : me.jailed && !justWatch ? (
        <View accessibilityRole="alert" style={[styles.hud, styles.amber]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Lock size={15} color={colors.amberInk} strokeWidth={2.4} />
            <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, letterSpacing: 0.3, color: colors.amberInk }}>VOCÊ ESTÁ PRESO</Text>
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 31, marginTop: 6, color: colors.amberInk }}>Fique aqui. Um corredor pode te soltar.</Text>
          <Text style={{ fontSize: 14, lineHeight: 19, fontFamily: fonts.bodyMedium, marginTop: 6, color: colors.amberInk }}>
            Quando ele chegar a 10 m, vocês dois voltam para o jogo.
          </Text>
        </View>
      ) : revealed && !caught ? (
        <RevealAlert key={revealed} until={revealed} now={now} />
      ) : beating ? (
        <HeartbeatCard pulse={pulse} />
      ) : (
        <ArcHud
          timeLabel={headstart ? (hunter ? 'Vantagem deles' : 'Vantagem') : 'Tempo restante'}
          time={mmss(left)}
          pingLabel={g.nextPingAt ? `${headstart ? '1º ping' : 'ping'} em ${mmss(ping)}` : 'sem mais pings'}
          progress={headstart ? 0 : 1 - ping / pingTotal}
          free={view.runners.free}
          total={view.runners.total}
          zone={zone ? `${zone.radius * 2} m` : '–'}
          zoneNote={g.shrinkAt ? `encolhe em ${mmss(secondsUntil(g.shrinkAt, now))}` : 'diâmetro'}
          status={caught ? 'off' : hunter ? 'team' : 'hidden'}
          statusLabel={caught ? 'Sua posição não é mais enviada' : hunter ? 'Só sua equipe te vê' : 'Ninguém te vê agora'}
          boosts={runnerPlaying ? me.boosts : null}
          onBoost={(b) => {
            setError(null);
            setUsing(b);
          }}
          urgent={left > 0 && left <= 10}
        />
      )}

      {/* Um aviso (fora da zona, preço do boost, coração...) cobre o placar: as
          bolinhas de boost seguem à vista embaixo dele, com a animação de pegar. */}
      {runnerPlaying && coveredHud ? (
        <BoostSlots
          boosts={me.boosts}
          onPress={(b) => {
            setError(null);
            setUsing(b);
          }}
        />
      ) : null}

      {picking ? (
        <Appear style={[styles.picker, { bottom: card }]}>
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
        </Appear>
      ) : shouting ? (
        <Appear style={[styles.picker, { bottom: card }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 28 }}>
              Grito<Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.pink }}>.</Text>
            </Text>
            <View accessibilityLabel={`${shoutsLeft} de 3 gritos restantes`} style={{ flexDirection: 'row', gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.dot, i < shoutsLeft ? { backgroundColor: colors.pink } : { borderWidth: 2, borderColor: '#55606B' }]} />
              ))}
            </View>
          </View>
          <Text variant="muted" style={{ marginTop: 8 }}>
            O celular do corredor mais perto começa a tocar um som (até ele desligar), se ele estiver a até 60 m de você. Escute de onde vem.
          </Text>
          <View style={styles.note}>
            <TriangleAlert size={16} color={colors.amber} />
            <Text style={{ flex: 1, fontSize: 13, color: colors.paperMuted }}>{shoutNote ?? 'Se ninguém estiver no alcance, o grito não gasta.'}</Text>
          </View>
          {shoutsLeft > 0 ? (
            <CardAction tone="pink" label="Gritar" hint={`${shoutsLeft} ${shoutsLeft === 1 ? 'restante' : 'restantes'}`} onPress={doShout} />
          ) : (
            <Text variant="label" style={{ marginTop: 12, textAlign: 'center' }}>Seus gritos acabaram nesta rodada.</Text>
          )}
          <CardAction label="Agora não" onPress={() => setShouting(false)} style={{ marginTop: 6, borderWidth: 0, backgroundColor: 'transparent' }} />
        </Appear>
      ) : me.rescue ? (
        <Appear style={[styles.picker, { bottom: card }]}>
          <Text style={{ fontFamily: fonts.display, fontSize: 20 }}>Soltando {me.rescue.name}: fique perto por 3 s</Text>
          <Text variant="small" style={{ marginTop: 4 }}>
            Se sair do círculo, o resgate recomeça. Os caçadores sabem onde {me.rescue.name} está preso: pode ser armadilha.
          </Text>
          <Bar value={(now - me.rescue.since) / 3000} style={{ marginTop: 12, height: 8 }} />
        </Appear>
      ) : using ? (
        <Appear style={[styles.picker, { bottom: card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {(() => {
              const b = BOOSTS[using.kind];
              return (
                <View style={[styles.boostIcon, { borderColor: b.color, backgroundColor: b.tint }]}>
                  <b.Icon size={22} color={b.color} strokeWidth={2.2} />
                </View>
              );
            })()}
            <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 24 }}>
              Usar {BOOSTS[using.kind].name}
              <Text style={{ fontFamily: fonts.display, fontSize: 24, color: BOOSTS[using.kind].color }}>?</Text>
            </Text>
          </View>
          <Text variant="muted" style={{ marginTop: 8 }}>{BOOSTS[using.kind].effect}</Text>
          {g.status !== 'hunt' ? <Text variant="label" style={{ marginTop: 8 }}>Dá para usar quando a caça começar.</Text> : null}
          {error ? <Text variant="error" style={{ marginTop: 8 }}>{error}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <CardAction label="Agora não" onPress={() => setUsing(null)} style={{ flex: 1 }} />
            {g.status === 'hunt' ? <CardAction tone="lime" label="Usar agora" onPress={confirmBoost} style={{ flex: 1 }} /> : null}
          </View>
        </Appear>
      ) : beating ? (
        <Appear style={[styles.picker, { bottom: card }]}>
          <Text style={{ fontFamily: fonts.display, fontSize: 20 }}>Fique parado ou saia devagar</Text>
          <Text variant="small" style={{ marginTop: 4 }}>O aviso não diz de onde ele vem. Correr chama atenção, ficar parado pode funcionar.</Text>
          <CardAction label="Fui pego" hint="sistema de honra" onPress={() => router.push({ pathname: '/pego', params: { id } })} />
        </Appear>
      ) : (
        <>
          {radioPeek.peek ? null : (
            <Rise key={actionsKey} style={[styles.actions, { bottom: card }]}>
              {denied ? (
                <Pill tone="amber" label="Libere a localização para jogar" />
              ) : me.jailed && !justWatch ? (
                <>
                  <Pill
                    tone="lime"
                    label={helpSent ? 'Pedido enviado' : 'Me salva!'}
                    onPress={() => {
                      setHelpSent(true);
                      sendQuick({ gameId: id as GameId, text: 'Me salva!' }).catch(() => setHelpSent(false));
                    }}
                  />
                  <Pill label="Só assistir" onPress={() => setJustWatch(true)} />
                </>
              ) : caught ? (
                <Pill label="Você foi pego · assistindo" />
              ) : hunter && headstart ? (
                <Pill icon={<Lock size={16} color={colors.pink} strokeWidth={2.4} />} label={`Você sai em ${mmss(left)}`} />
              ) : hunter ? (
                <>
                  <Pill tone="lime" label="Marquei um corredor" onPress={() => setPicking(true)} />
                  {me.shoutsLeft !== null ? (
                    <Pill
                      tone="pink"
                      a11y={`Grito, ${shoutsLeft} restantes`}
                      icon={<Megaphone size={18} color={colors.paper} />}
                      label={String(shoutsLeft)}
                      onPress={() => {
                        setShoutNote(null);
                        setShouting(true);
                      }}
                    />
                  ) : null}
                </>
              ) : headstart ? (
                // Ninguém é pego antes do caçador sair.
                <Pill icon={<Lock size={16} color={colors.pink} strokeWidth={2.4} />} label={`Caçador sai em ${mmss(left)}`} />
              ) : (
                <Pill
                  a11y="Fui pego, sistema de honra"
                  icon={<Hand size={18} color="#FF8FA8" strokeWidth={2.2} />}
                  label="Fui pego"
                  onPress={() => router.push({ pathname: '/pego', params: { id } })}
                />
              )}
            </Rise>
          )}
          <RadioBubble peek={radioPeek.peek} unread={radioPeek.unread} bottom={card} onPress={() => radioPeek.open(id)} />
        </>
      )}
      <GameTabs />
    </View>
  );
}

// Qual aviso de boost está valendo (sem o relógio): a bolinha só abre quando ele muda.
function boostKeyFor(me: { blockedBoost?: string | null; shieldUntil?: number | null; nextPing?: string | null }, now: number) {
  if (me.blockedBoost) return 'cheio:' + me.blockedBoost;
  if (me.shieldUntil && me.shieldUntil > now) return 'escudo';
  return me.nextPing ?? null;
}

// O que o Radio mostra para o corredor quando um boost dele está em jogo.
function boostLineFor(me: { blockedBoost?: string | null; shieldUntil?: number | null; nextPing?: string | null }, now: number) {
  const shield = me.shieldUntil && me.shieldUntil > now ? secondsUntil(me.shieldUntil, now) : 0;
  if (me.blockedBoost) return `Seus 2 boosts estão cheios. Use um para pegar o ${me.blockedBoost}.`;
  if (shield) return `Escudo ativo: ninguém te marca por ${mmss(shield)}.`;
  if (me.nextPing === 'sombra') return 'Sombra ativa: você some do próximo ping.';
  if (me.nextPing === 'despiste') return 'Despiste ativo: seu próximo ping sai no lugar errado.';
  return null;
}

// Manda para onde estou virado: no máximo a cada 1,5 s e só se virar 15° ou mais.
function useSendHeading(id: string, active: boolean) {
  const heading = useHeading(active);
  const send = useMutation(api.play.setHeading);
  const last = useRef({ at: 0, deg: -999 });
  useEffect(() => {
    if (!active || heading === null) return;
    const now = Date.now();
    const diff = Math.abs(((heading - last.current.deg + 540) % 360) - 180);
    if (now - last.current.at < 1500 || diff < 15) return;
    last.current = { at: now, deg: heading };
    send({ gameId: id as GameId, heading }).catch(() => {});
  }, [heading, active, id, send]);
}

// Entra subindo e aparecendo (os botões de baixo quando a situação muda).
function Rise({ style, children }: { style: React.ComponentProps<typeof View>['style']; children: React.ReactNode }) {
  const k = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(k, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [k]);
  return (
    <Animated.View style={[style, { opacity: k, transform: [{ translateY: k.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>{children}</Animated.View>
  );
}

// Botão redondo da parte de baixo (17.1 e 17.3): Fui pego, Marquei, Grito...
function Pill({ label, tone, icon, a11y, onPress }: { label: string; tone?: 'lime' | 'pink' | 'amber'; icon?: React.ReactNode; a11y?: string; onPress?: () => void }) {
  const bg = tone === 'lime' ? colors.lime : tone === 'pink' ? colors.pink : tone === 'amber' ? colors.amber : 'rgba(26,32,39,0.96)';
  const fg = tone === 'lime' ? colors.limeInk : tone === 'amber' ? colors.amberInk : colors.paper;
  return (
    <Pressy
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={a11y ?? label}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.pill, { backgroundColor: bg }, !tone && styles.pillDark]}>
      {icon}
      <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: fonts.bodyStrong, color: fg, flexShrink: 1 }}>
        {label}
      </Text>
    </Pressy>
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
    backgroundColor: 'rgba(26,32,39,0.98)',
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.xl,
    padding: 16,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  boostIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 14, backgroundColor: colors.ink, borderRadius: radius.md, padding: 12 },
  shoutBtn: {
    marginTop: 12,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.pink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actions: { position: 'absolute', left: 16, right: 84, flexDirection: 'row', gap: 8 },
  pill: { height: 56, borderRadius: 28, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  pillDark: { borderWidth: 1, borderColor: colors.inkBorder },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.ink },
});
