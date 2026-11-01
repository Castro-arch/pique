import { useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import { Check } from '@/components/icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BENTO, Sticker } from '@/components/Bento';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { GameMap } from '@/components/GameMap';
import { Appear } from '@/components/Motion';
import { Logo } from '@/components/Nav';
import { OutlinedText } from '@/components/OutlinedText';
import { Text } from '@/components/Text';
import { useScreenInsets } from '@/lib/screenInsets';
import { TUTORIAL_CENTER } from '@/lib/tutorialRoutes';
import { colors, fonts } from '@/theme/tokens';
import { api } from '../../convex/_generated/api';

// 1.4 Seu nome no jogo (cadastro depois do convite e do aceite), no visual
// novo: título com contorno e uma prévia de como você aparece no mapa.
export default function Nome() {
  const insets = useScreenInsets();
  const setProfile = useMutation(api.users.setProfile);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      await setProfile({ name, username });
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : 'Não deu para salvar. Tenta de novo.');
      setLoading(false);
    }
  }

  const userOk = username.length >= 3;
  const first = name.trim().split(/\s+/)[0] || 'Você';
  const initial = (name.trim()[0] ?? '?').toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: BENTO.ink }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top, 20) + 14, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 12 }}
        keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', height: 48, justifyContent: 'center' }}>
          <Logo />
        </View>

        <Appear style={{ alignItems: 'center', marginTop: 18 }}>
          <OutlinedText text="Como a crew" size={44} label="Como a crew te chama?" />
          <View style={{ marginTop: -6 }}>
            <OutlinedText text="te chama?" size={44} label="" />
          </View>
          <Text style={styles.sub}>É assim que você aparece no mapa, no rádio e no seu perfil.</Text>
        </Appear>

        {/* prévia: a sua bolinha no mapa, mudando enquanto você digita */}
        <Appear delay={70} style={styles.preview}>
          {/* o mapa de ruas de verdade (o mesmo do jogo), parado, com a zona */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <GameMap zone={{ ...TUTORIAL_CENTER, radius: 90 }} nextZoneRadius={null} people={[]} now={0} hunter={false} outOfZone={false} padding={{ top: 4, bottom: 4, left: 4, right: 4 }} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={styles.me}>
              <Text style={{ fontFamily: fonts.display, fontSize: 28, color: BENTO.ink }}>{initial}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, color: BENTO.ink }} numberOfLines={1}>
                {first}
                {userOk ? <Text style={{ fontSize: 12, color: BENTO.ink, opacity: 0.6 }}> @{username}</Text> : null}
              </Text>
            </View>
          </View>
          <View style={{ position: 'absolute', right: 26, top: 14 }}>
            <Sticker kind="hand" color={colors.pink} size={46} tilt={14} edge={colors.paper} />
          </View>
        </Appear>

        <Appear delay={120} style={{ gap: 12, marginTop: 20 }}>
          <Field label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" autoComplete="name" maxLength={40} />
          <Field
            label="Usuário"
            value={username}
            onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="seu_usuario"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            trailing={
              userOk ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Check size={16} color={colors.lime} strokeWidth={2.6} />
                  <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 13 }}>ok</Text>
                </View>
              ) : null
            }
          />
          <Text style={styles.hint}>Usuário: 3 a 20 letras minúsculas, números ou _. Dá para trocar o nome depois.</Text>
        </Appear>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ flex: 1, minHeight: 20 }} />
        <Button label="Continuar" onPress={save} loading={loading} disabled={name.trim().length < 2 || !userOk} style={{ minHeight: 60, borderRadius: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: '#C9C7BF', marginTop: 10, textAlign: 'center' },
  preview: { height: 170, marginTop: 18, borderRadius: 24, backgroundColor: BENTO.tile, borderWidth: 2, borderColor: colors.lime, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  me: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.lime, borderWidth: 4, borderColor: colors.paper, boxShadow: '0 0 0 8px rgba(200,242,60,0.25)', alignItems: 'center', justifyContent: 'center' },
  tag: { marginTop: 8, backgroundColor: colors.lime, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12, maxWidth: 240 },
  hint: { fontSize: 12, lineHeight: 17, color: BENTO.muted },
  error: { fontSize: 13, fontFamily: fonts.bodyStrong, color: colors.pink, marginTop: 12 },
});
