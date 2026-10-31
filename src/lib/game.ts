import { useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { startBackgroundTracking, stopBackgroundTracking } from './backgroundLocation';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

// Ponte entre as telas e a partida no Convex. Sem `id` na rota, as telas
// continuam no modo demonstração com os dados de src/lib/demo.ts.

export type GameId = Id<'games'>;

// Código de erro que o servidor manda ({ code: 'PAYWALL' }) ou a mensagem pronta.
export function errorInfo(e: unknown): { code: string | null; message: string } {
  if (e instanceof ConvexError) {
    const data = e.data as unknown;
    if (data && typeof data === 'object' && 'code' in data) return { code: String((data as { code: string }).code), message: '' };
    return { code: null, message: String(data) };
  }
  return { code: null, message: 'Não deu certo. Confira a internet e tente de novo.' };
}

export function useCreateGame() {
  const create = useMutation(api.games.create);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const { gameId } = await create({});
      router.push({ pathname: '/lobby', params: { id: gameId } });
    } catch (e) {
      const { code, message } = errorInfo(e);
      if (code === 'PAYWALL') router.push('/hospedar');
      else setError(message);
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, error };
}

// Entrar pelo código. Devolve o motivo quando não dá.
export function useJoinGame() {
  const join = useMutation(api.games.join);
  return async (code: string): Promise<{ ok: true; gameId: GameId } | { ok: false; code: string | null; message: string }> => {
    try {
      const { gameId } = await join({ code });
      return { ok: true, gameId };
    } catch (e) {
      return { ok: false, ...errorInfo(e) };
    }
  };
}

export const useLobby = (id?: string) => useQuery(api.games.lobby, id ? { gameId: id as GameId } : 'skip');
export const useView = (id?: string) => useQuery(api.play.view, id ? { gameId: id as GameId } : 'skip');

// A roleta já abriu a revelação antes da rodada começar: quando ela começar,
// as telas de baixo (lobby, espera) não abrem a revelação de novo.
const revealedAt: Record<string, number> = {};
export function revealedEarly(id: string) {
  revealedAt[id] = Date.now();
}

// Quando o anfitrião começa a rodada, todo mundo vai para a revelação do papel.
export function useFollowRound(id: string | undefined, status: string | undefined) {
  const seen = useRef(status);
  useEffect(() => {
    if (!id || !status) return;
    if (seen.current === 'lobby' || seen.current === 'ended') {
      const early = Date.now() - (revealedAt[id] ?? 0) < 20_000;
      if (status === 'headstart' && !early) router.replace({ pathname: '/papel', params: { id } });
    }
    seen.current = status;
  }, [id, status]);
}

// Envia a posição enquanto a tela do jogo está aberta (só se mexer > 5 m).
// O serviço em segundo plano (task-manager) chega junto com o mapa real.
export function useSendPosition(id: string | undefined, active: boolean) {
  const send = useMutation(api.play.sendPosition);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    if (!id || !active) return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    const push = (lat: number, lng: number, accuracy: number | null, mocked = false) => {
      if (cancelled) return;
      send({ gameId: id as GameId, lat, lng, accuracy: accuracy ?? 99, mocked }).catch(() => {});
    };

    // No navegador o watchPositionAsync do expo-location não entrega as
    // atualizações (ele troca o id da inscrição pelo id do navegador),
    // então na web usamos a geolocalização do navegador direto.
    if (Platform.OS === 'web') {
      if (!('geolocation' in navigator)) {
        setDenied(true);
        return;
      }
      const watchId = navigator.geolocation.watchPosition(
        (p) => push(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
        (err) => err.code === err.PERMISSION_DENIED && setDenied(true),
        { enableHighAccuracy: true, maximumAge: 2000 },
      );
      return () => {
        cancelled = true;
        navigator.geolocation.clearWatch(watchId);
      };
    }

    // No celular: primeiro tenta o envio com a tela bloqueada; se a pessoa não
    // liberar "o tempo todo", envia só enquanto o app está aberto.
    (async () => {
      if (await startBackgroundTracking(id)) return;
      if (cancelled) return;
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return setDenied(true);
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
        (loc) => push(loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy, loc.mocked ?? false),
      );
    })();
    return () => {
      cancelled = true;
      sub?.remove();
      stopBackgroundTracking();
    };
  }, [id, active, send]);
  return { denied };
}

// Relógio que anda sozinho, para contar até um horário do servidor.
export function useNow(every = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

export const secondsUntil = (at: number | null | undefined, now: number) => (at ? Math.max(0, Math.round((at - now) / 1000)) : 0);
