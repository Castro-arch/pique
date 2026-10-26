/// <reference types="google.maps" />
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BoostPin } from '@/components/Boosts';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

import { personState, personTag, type GameMapProps } from './gameMapTypes';

// Satélite de verdade no navegador (quem joga pelo iPhone usa o site).
// Usa a Maps JavaScript API com uma chave só para o site, presa ao domínio
// (EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY). Sem chave, ou se o Google recusar,
// o GameMap volta para o mapa desenhado.

type Maps = typeof google.maps;
let loading: Promise<Maps> | null = null;
const failures = new Set<() => void>();

function loadMaps(key: string) {
  if (loading) return loading;
  loading = new Promise<Maps>((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    w.__piqueMapsReady = () => resolve(google.maps);
    // O Google chama isto quando a chave é inválida ou não vale para o domínio.
    w.gm_authFailure = () => failures.forEach((f) => f());
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=__piqueMapsReady&loading=async&language=pt-BR&region=BR`;
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error('Não deu para carregar o Google Maps.'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export function SatelliteMap({
  apiKey,
  onFail,
  zone,
  nextZoneRadius,
  people,
  now,
  hunter,
  outOfZone,
  dim = 0,
  boosts = [],
}: GameMapProps & { apiKey: string; onFail: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    failures.add(onFail);
    let alive = true;
    loadMaps(apiKey)
      .then((maps) => {
        if (!alive || !el.current) return;
        setMap(
          new maps.Map(el.current, {
            center: zone ? { lat: zone.lat, lng: zone.lng } : { lat: -23.55, lng: -46.63 },
            zoom: 17,
            mapTypeId: 'satellite',
            tilt: 0,
            disableDefaultUI: true,
            clickableIcons: false,
            keyboardShortcuts: false,
            gestureHandling: 'greedy',
            backgroundColor: colors.inkSunken,
          }),
        );
      })
      .catch(onFail);
    return () => {
      alive = false;
      failures.delete(onFail);
    };
  }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enquadra a zona inteira, com folga para o placar em cima e o Radio embaixo.
  useEffect(() => {
    if (!map || !zone) return;
    const bounds = new google.maps.Circle({ center: { lat: zone.lat, lng: zone.lng }, radius: zone.radius }).getBounds();
    if (bounds) map.fitBounds(bounds, { top: 250, bottom: 230, left: 16, right: 16 });
  }, [map, zone?.lat, zone?.lng, zone?.radius]); // eslint-disable-line react-hooks/exhaustive-deps

  // Zona (e a zona nova, quando vai encolher).
  useEffect(() => {
    if (!map || !zone) return;
    const center = { lat: zone.lat, lng: zone.lng };
    const circles = [
      new google.maps.Circle({
        map,
        center,
        radius: zone.radius,
        strokeColor: nextZoneRadius ? colors.paper : colors.lime,
        strokeOpacity: nextZoneRadius ? 0.55 : 0.85,
        strokeWeight: 2,
        fillColor: nextZoneRadius ? colors.amber : colors.lime,
        fillOpacity: nextZoneRadius ? 0.16 : 0.06,
        clickable: false,
      }),
    ];
    if (nextZoneRadius) {
      circles.push(
        new google.maps.Circle({ map, center, radius: nextZoneRadius, strokeColor: colors.lime, strokeWeight: 2.5, fillColor: colors.lime, fillOpacity: 0.08, clickable: false }),
      );
    }
    return () => circles.forEach((c) => c.setMap(null));
  }, [map, zone?.lat, zone?.lng, zone?.radius, nextZoneRadius]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={StyleSheet.absoluteFill}>
      <div ref={el} style={{ position: 'absolute', inset: 0, background: colors.inkSunken }} />
      {map
        ? boosts.map((b) => (
            <Overlay key={b.id} map={map} lat={b.lat} lng={b.lng} anchor="translate(-50%, -22px)">
              <View style={{ width: 80 }}>
                <BoostPin kind={b.kind} />
              </View>
            </Overlay>
          ))
        : null}
      {map
        ? people.map((p) => {
            const size = p.isMe ? 46 : 36;
            return (
              <Overlay key={p.id} map={map} lat={p.lat} lng={p.lng} anchor={`translate(-${size / 2}px, -50%)`} zIndex={p.isMe ? 10 : 1}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Avatar name={p.name} size={size} state={personState(p, outOfZone)} glow={p.isMe} frame={p.frame} />
                  <View style={[styles.tag, p.isMe && { backgroundColor: hunter ? colors.pink : colors.lime }]}>
                    <Text
                      style={{
                        fontSize: p.isMe ? 12 : 11,
                        fontFamily: fonts.bodyStrong,
                        color: p.isMe ? (hunter ? colors.pinkInk : colors.limeInk) : colors.paper,
                      }}>
                      {personTag(p, now)}
                    </Text>
                  </View>
                </View>
              </Overlay>
            );
          })
        : null}
      {/* Degradês leves em cima e embaixo, como no celular, para o placar e o Radio lerem bem. */}
      <LinearGradient pointerEvents="none" colors={['rgba(11,14,17,0.55)', 'rgba(11,14,17,0)']} style={[styles.fade, { top: 0, height: 240 }]} />
      <LinearGradient pointerEvents="none" colors={['rgba(11,14,17,0)', 'rgba(11,14,17,0.6)']} style={[styles.fade, { bottom: 0, height: 320 }]} />
      {dim > 0 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(11,14,17,${dim})` }]} /> : null}
    </View>
  );
}

// Coloca componentes do app num ponto do mapa do Google e acompanha o zoom.
function Overlay({ map, lat, lng, anchor, zIndex = 1, children }: { map: google.maps.Map; lat: number; lng: number; anchor: string; zIndex?: number; children: ReactNode }) {
  const [div] = useState(() => {
    const d = document.createElement('div');
    d.style.position = 'absolute';
    return d;
  });
  const pos = useRef({ lat, lng });
  pos.current = { lat, lng };
  const overlay = useRef<google.maps.OverlayView | null>(null);

  useEffect(() => {
    const o = new google.maps.OverlayView();
    o.onAdd = () => o.getPanes()?.overlayMouseTarget.appendChild(div);
    o.draw = () => {
      const p = o.getProjection()?.fromLatLngToDivPixel(new google.maps.LatLng(pos.current.lat, pos.current.lng));
      if (!p) return;
      div.style.left = `${p.x}px`;
      div.style.top = `${p.y}px`;
    };
    o.onRemove = () => div.remove();
    o.setMap(map);
    overlay.current = o;
    return () => o.setMap(null);
  }, [map, div]);

  useEffect(() => {
    overlay.current?.draw();
  }, [lat, lng]);

  div.style.transform = anchor;
  div.style.zIndex = String(zIndex);
  return createPortal(children, div);
}

const styles = StyleSheet.create({
  tag: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: 'rgba(26,32,39,0.92)' },
  fade: { position: 'absolute', left: 0, right: 0 },
});
