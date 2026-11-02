import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/Button';
import { Segmented } from '@/components/Controls';
import { Camera, Share2 } from '@/components/icons';
import { CloseButton } from '@/components/Nav';
import { PostMap } from '@/components/PostMap';
import { Screen } from '@/components/Screen';
import { Headline, Text } from '@/components/Text';
import { track } from '@/lib/analytics';
import { useView } from '@/lib/game';
import { renderPost, shareImage, stickerLine, type PostData } from '@/lib/postImage';
import { readTrail, trailPath, type TrailPoint } from '@/lib/trail';
import { colors, fonts, radius } from '@/theme/tokens';

type Visual = 'mapa' | 'selfie' | 'adesivo';

const MIN = 60_000;
const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`);
// ritmo como nos apps de corrida: minutos por km
const pace = (ms: number, m: number) => {
  if (m < 200) return '–';
  const s = Math.round(ms / 1000 / (m / 1000));
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}"`;
};

// Post da partida de verdade, do ponto de vista de quem olha (corredor ou
// caçador): o trajeto que o próprio celular gravou num mapa de ruas, e os
// números da rodada. "Postar" gera a imagem (src/lib/postImage.ts).
export function PostReal({ id }: { id: string }) {
  const view = useView(id);
  const startedAt = view?.game.startedAt;
  const trail = useMemo(() => (startedAt ? readTrail(id, startedAt) : []), [id, startedAt]);
  if (!view) return <View style={{ flex: 1, backgroundColor: colors.ink }} />;
  return <PostScreen view={view} trail={trail} />;
}

type PostView = NonNullable<ReturnType<typeof useView>>;

// A tela em si, com os dados prontos (a prévia de testes usa direto).
export function PostScreen({ view, trail }: { view: PostView; trail: TrailPoint[] }) {
  const [visual, setVisual] = useState<Visual>('mapa');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const mapCanvas = useRef<HTMLCanvasElement | null>(null);

  const g = view.game;
  const me = view.me;

  const hunter = me.role === 'hunter';
  const accent = hunter ? colors.pink : colors.lime;
  const won = g.winner === me.role;
  const start = g.startedAt ?? 0;
  const end = g.endedAt ?? Date.now();
  const myEnd = hunter ? end : (me.caughtAt ?? end);
  const pings = Math.max(0, Math.floor((myEnd - (start + g.headStartMin * MIN)) / (g.pingEveryMin * MIN)));
  const total = view.runners.total;

  const data: PostData = hunter
    ? {
        kicker: won ? 'CAÇADOR · PEGUEI TODO MUNDO' : `CAÇADOR · PEGUEI ${me.catches} DE ${total}`,
        big: String(me.catches),
        bigUnit: me.catches === 1 ? 'pego' : 'pegos',
        tagline: won ? 'peguei geral' : `peguei ${me.catches} de ${total}`,
        stats: [
          ['Distância', km(me.distanceM)],
          ['Ritmo', pace(myEnd - start, me.distanceM)],
          ['Rodada', clock(end - start)],
        ],
        accent,
        trail,
      }
    : {
        kicker: won ? 'CORREDOR · NINGUÉM ME ACHOU' : 'CORREDOR · SEGUREI ATÉ ME ACHAREM',
        big: clock(myEnd - start),
        bigUnit: 'escondido',
        tagline: won ? 'ninguém me achou' : `segurei ${clock(myEnd - start)}`,
        stats: [
          ['Distância', km(me.distanceM)],
          ['Ritmo', pace(myEnd - start, me.distanceM)],
          ['Pings livres', String(pings)],
        ],
        accent,
        trail,
      };
  const title = hunter ? (won ? 'Limpou geral' : `Pegou ${me.catches}`) : won ? 'Ninguém te achou' : `Segurou ${clock(myEnd - start)}`;
  const text = `${data.tagline[0].toUpperCase()}${data.tagline.slice(1)} no Pique, o pique-esconde pela cidade. Bora? https://pique.expo.app`;

  const post = async (save: boolean) => {
    track('invite_shared', { from: 'post' });
    if (Platform.OS !== 'web') return Share.share({ message: text });
    if (visual === 'selfie' && !photo) return pickPhoto();
    setBusy(save ? 'save' : 'share');
    try {
      const blob = await renderPost(visual, data, { map: mapCanvas.current, photo });
      if (blob) await shareImage(blob, text, save);
    } finally {
      setBusy(null);
    }
  };
  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!r.canceled && r.assets[0]) setPhoto(r.assets[0].uri);
  };

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 }}>
        <Text variant="small">{`${g.code} · Rodada ${g.round}`}</Text>
        <CloseButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
      <Headline variant="h2" dot={accent} style={{ marginTop: 6 }}>
        {title}
      </Headline>
      <Text variant="muted" style={{ marginTop: 6 }}>
        {trail.length > 1 ? 'Seu trajeto da rodada, gravado só no seu celular. Escolha o visual e poste.' : 'Este celular não gravou o trajeto desta rodada, mas os números estão aqui. Escolha o visual e poste.'}
      </Text>

      <View style={{ marginTop: 16 }}>
        {visual === 'mapa' ? (
          <MapCard data={data} zone={g.zone} onCanvas={(c) => (mapCanvas.current = c)} />
        ) : visual === 'selfie' ? (
          <SelfieCard data={data} photo={photo} onPick={pickPhoto} />
        ) : (
          <StickerCard data={data} />
        )}
      </View>

      <Segmented<Visual>
        value={visual}
        onChange={setVisual}
        style={{ marginTop: 14 }}
        options={[
          { value: 'mapa', label: 'Mapa' },
          { value: 'selfie', label: 'Foto' },
          { value: 'adesivo', label: 'Adesivo' },
        ]}
      />

      <Button
        variant={hunter ? 'danger' : 'primary'}
        label={visual === 'selfie' && !photo ? 'Escolher foto' : visual === 'adesivo' ? 'Postar adesivo no story' : 'Postar no story'}
        icon={<Share2 size={18} color={hunter ? colors.paper : colors.limeInk} />}
        loading={busy === 'share'}
        style={{ marginTop: 14 }}
        onPress={() => post(false)}
      />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Button variant="secondary" size="md" label="Salvar imagem" loading={busy === 'save'} style={{ flex: 1 }} onPress={() => post(true)} />
        <Button variant="secondary" size="md" label="Revanche" style={{ flex: 1 }} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
    </Screen>
  );
}

function Numbers({ data }: { data: PostData }) {
  return (
    <View style={styles.numbers}>
      <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong, letterSpacing: 0.6, color: data.accent }}>{data.kicker}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 64, lineHeight: 66, letterSpacing: -2 }}>
        {data.big}
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14 }}> {data.bigUnit}</Text>
      </Text>
      <View style={{ flexDirection: 'row', gap: 20, marginTop: 4 }}>
        {data.stats.map(([l, v]) => (
          <View key={l}>
            <Text style={{ fontSize: 11, color: colors.paperMuted }}>{l}</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 18 }}>{v}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text variant="label">Pique-esconde de verdade, pela cidade.</Text>
        <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong }}>pique.expo.app</Text>
      </View>
    </View>
  );
}

function Brand() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: colors.lime }} />
      <Text style={{ fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.5 }}>pique</Text>
    </View>
  );
}

function MapCard({ data, zone, onCanvas }: { data: PostData; zone: { lat: number; lng: number; radius: number } | null; onCanvas: (c: HTMLCanvasElement) => void }) {
  return (
    <View style={styles.card} accessible accessibilityRole="image" accessibilityLabel={`Prévia do post: trajeto no mapa, ${data.big} ${data.bigUnit}`}>
      <PostMap trail={data.trail} zone={zone} accent={data.accent} onCanvas={onCanvas} padding={{ top: 60, bottom: 235, left: 36, right: 36 }} />
      <LinearGradient pointerEvents="none" colors={['rgba(11,14,17,0)', 'rgba(11,14,17,0.92)']} style={styles.bottomFade} />
      <View style={styles.topRow} pointerEvents="none">
        <Brand />
      </View>
      <Numbers data={data} />
    </View>
  );
}

function SelfieCard({ data, photo, onPick }: { data: PostData; photo: string | null; onPick: () => void }) {
  return (
    <View style={styles.card}>
      {photo ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Pressable onPress={onPick} style={styles.pick} accessibilityRole="button">
          <Camera size={28} color={colors.paperMuted} />
          <Text style={{ fontFamily: fonts.bodyStrong, color: colors.paperMuted, marginTop: 8 }}>Toque para escolher uma foto da crew</Text>
        </Pressable>
      )}
      <LinearGradient pointerEvents="none" colors={['rgba(11,14,17,0.5)', 'rgba(11,14,17,0)', 'rgba(11,14,17,0.92)']} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.topRow}>
        <Brand />
        {photo ? (
          <Pressable accessibilityRole="button" onPress={onPick} style={styles.swap}>
            <Camera size={14} color={colors.paper} />
            <Text style={{ fontSize: 12, fontFamily: fonts.bodyStrong }}>Trocar foto</Text>
          </Pressable>
        ) : null}
      </View>
      <Numbers data={data} />
    </View>
  );
}

function StickerCard({ data }: { data: PostData }) {
  const p = trailPath(data.trail, 200, 130, 8);
  return (
    <View style={[styles.card, styles.checker]} accessible accessibilityRole="image" accessibilityLabel="Prévia do adesivo transparente com o trajeto e os números da rodada">
      <Text variant="label" style={{ position: 'absolute', top: 14, alignSelf: 'center' }}>Fundo transparente · cola em qualquer foto</Text>
      <View style={{ alignItems: 'center' }}>
        {p ? (
          <Svg width={200} height={130} viewBox="0 0 200 130">
            <Path d={p.path} stroke="rgba(11,14,17,0.55)" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={p.path} stroke={data.accent} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : null}
        <Text style={{ fontFamily: fonts.display, fontSize: 64, lineHeight: 66, letterSpacing: -2, color: colors.paper }}>{data.big}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: data.accent }}>{data.tagline}</Text>
        <Text style={{ fontSize: 13, fontFamily: fonts.bodyStrong, marginTop: 6 }}>{stickerLine(data)}</Text>
        <View style={{ marginTop: 10 }}>
          <Brand />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { aspectRatio: 4 / 5, borderRadius: radius.xxl, overflow: 'hidden', backgroundColor: colors.inkSunken },
  checker: { backgroundColor: '#2A2F35', borderWidth: 1, borderColor: colors.inkBorder, alignItems: 'center', justifyContent: 'center' },
  pick: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 140 },
  topRow: { position: 'absolute', left: 16, right: 16, top: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  swap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,20,24,0.7)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 250 },
  numbers: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(243,240,232,0.15)' },
});
