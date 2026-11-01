import { useAuthActions } from '@convex-dev/auth/react';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';

import { BENTO, Sticker, type StickerKind } from '@/components/Bento';
import { Button } from '@/components/Button';
import { Appear } from '@/components/Motion';
import { Logo } from '@/components/Nav';
import { OutlinedText } from '@/components/OutlinedText';
import { Text } from '@/components/Text';
import { BETA_SEM_LOGIN } from '@/lib/beta';
import { useScreenInsets } from '@/lib/screenInsets';
import { colors, fonts } from '@/theme/tokens';

// 1.1 Boas-vindas (visual novo, igual ao Início): fundo verde, uma zona com
// as figurinhas do jogo e o título com contorno. "Começar" cria a conta
// (no beta, uma conta anônima presa ao celular) e segue para o convite.
export default function BemVindo() {
  const { signIn } = useAuthActions();
  const insets = useScreenInsets();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!BETA_SEM_LOGIN) return router.push('/como-entrar');
    setError(null);
    setStarting(true);
    try {
      await signIn('anonymous');
    } catch {
      setError('Não deu para começar. Confira a internet e tente de novo.');
      setStarting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.lime }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top, 20) + 14, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
        <View style={{ alignItems: 'center', height: 48, justifyContent: 'center' }}>
          <Logo ink color={BENTO.ink} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 16 }}>
          <Appear>
            <Scene />
          </Appear>
          <Appear delay={90} style={{ alignItems: 'center', marginTop: 18 }}>
            <OutlinedText text="Pique-esconde" size={50} label="Pique-esconde pela cidade" />
            <View style={{ marginTop: -6 }}>
              <OutlinedText text="pela cidade" size={50} dot={colors.pink} label="" />
            </View>
            <Text style={styles.sub}>Uns se escondem, outros caçam, nas ruas de verdade. O celular cuida do tempo, dos pings e de quem ganhou.</Text>
          </Appear>
        </View>

        <Appear delay={150} style={{ gap: 10 }}>
          <Button label="Começar" variant="dark" loading={starting} onPress={start} style={styles.go} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {BETA_SEM_LOGIN ? null : (
            <Text onPress={() => router.push('/como-entrar')} style={styles.link}>
              Já tenho conta
            </Text>
          )}
          <Text style={styles.legal}>
            Ao continuar, você aceita os{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/termos')}>
              Termos de uso
            </Text>{' '}
            e a{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/privacidade')}>
              Política de privacidade
            </Text>
            .
          </Text>
        </Appear>
      </ScrollView>
    </View>
  );
}

// A cena: a zona tracejada com corredores, o caçador e os boosts, em figurinhas
// que flutuam devagar.
function Scene() {
  return (
    <View style={styles.scene}>
      <View style={styles.zone} />
      <Float x={-92} y={-58} delay={0}>
        <Person l="P" />
      </Float>
      <Float x={84} y={-70} delay={250}>
        <Person l="T" />
      </Float>
      <Float x={-18} y={46} delay={500}>
        <Person l="L" hunter />
      </Float>
      <Float x={96} y={38} delay={700}>
        <Person l="S" />
      </Float>
      <Float x={-104} y={36} delay={350}>
        <StickerFloat kind="ghost" color="#B57CFF" />
      </Float>
      <Float x={18} y={-96} delay={150}>
        <StickerFloat kind="shuffle" color={colors.lime} />
      </Float>
      <Float x={0} y={-18} delay={0} big>
        <Sticker kind="hand" color={colors.pink} size={84} tilt={-12} />
      </Float>
    </View>
  );
}

function Float({ x, y, delay, big, children }: { x: number; y: number; delay: number; big?: boolean; children: React.ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);
  const size = big ? 84 : 44;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        marginLeft: x - size / 2,
        marginTop: y - size / 2,
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, big ? -8 : -5] }) }],
      }}>
      {children}
    </Animated.View>
  );
}

function StickerFloat({ kind, color }: { kind: StickerKind; color: string }) {
  return <Sticker kind={kind} color={color} size={40} tilt={8} />;
}

// Uma pessoa como no mapa: corredor verde, caçador com anel rosa.
function Person({ l, hunter }: { l: string; hunter?: boolean }) {
  return (
    <View style={[styles.person, hunter ? { backgroundColor: BENTO.ink, borderColor: colors.pink } : null]}>
      <Text style={{ fontFamily: fonts.display, fontSize: 15, color: hunter ? colors.paper : BENTO.ink }}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { height: 240, alignSelf: 'stretch' },
  zone: { position: 'absolute', left: '50%', top: '50%', width: 236, height: 236, marginLeft: -118, marginTop: -118, borderRadius: 118, borderWidth: 3, borderStyle: 'dashed', borderColor: BENTO.ink, backgroundColor: 'rgba(11,15,19,0.06)' },
  person: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.paper, borderWidth: 3, borderColor: BENTO.ink, boxShadow: '2px 3px 0 #0B0F13', alignItems: 'center', justifyContent: 'center' },
  sub: { fontFamily: fonts.display, fontSize: 18, lineHeight: 23, letterSpacing: -0.3, color: BENTO.ink, opacity: 0.78, marginTop: 12, textAlign: 'center' },
  go: { minHeight: 60, borderRadius: 24, backgroundColor: BENTO.ink, boxShadow: '0 10px 24px rgba(11,15,19,0.25)' },
  error: { fontSize: 13, fontFamily: fonts.bodyStrong, color: '#B0001F', textAlign: 'center' },
  link: { textAlign: 'center', fontSize: 14, fontFamily: fonts.bodyStrong, color: BENTO.ink, opacity: 0.65, paddingVertical: 4 },
  legal: { textAlign: 'center', fontSize: 12, lineHeight: 17, color: BENTO.ink, opacity: 0.7 },
  legalLink: { fontSize: 12, fontFamily: fonts.bodyStrong, color: BENTO.ink, textDecorationLine: 'underline' },
});
