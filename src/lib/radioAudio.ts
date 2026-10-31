import { useMutation } from 'convex/react';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useRef, useState } from 'react';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { errorInfo, type GameId } from './game';

const MAX_SECONDS = 15; // o servidor recusa áudio maior

// Tocar para falar: o primeiro toque liga o microfone (a tela já muda na hora,
// enquanto o microfone acorda) e o segundo envia para o armazenamento do
// Convex (apagado no fim da rodada). Tocar de novo antes de ligar cancela.
export function useTalk(id: string | undefined) {
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const uploadUrl = useMutation(api.radio.uploadUrl);
  const sendAudio = useMutation(api.radio.sendAudio);
  const [recording, setRecording] = useState(false);
  const [opening, setOpening] = useState(false);
  const cancelled = useRef(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(0);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref e não estado: o corte de 15 s chama stop() de dentro de um timer.
  const live = useRef(false);

  const start = async () => {
    if (!id || live.current || sending || opening) return;
    setError(null);
    setOpening(true);
    cancelled.current = false;
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return setError('Libere o microfone para falar no Radio.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (cancelled.current) return;
      recorder.record();
    } catch (e) {
      return setError(errorInfo(e).message);
    } finally {
      setOpening(false);
    }
    startedAt.current = Date.now();
    live.current = true;
    setRecording(true);
    limit.current = setTimeout(() => void stop(), MAX_SECONDS * 1000);
  };

  const stop = async () => {
    // Ainda ligando o microfone: cancela em vez de gravar sem ninguém saber.
    if (opening) {
      cancelled.current = true;
      setOpening(false);
      return;
    }
    if (limit.current) clearTimeout(limit.current);
    limit.current = null;
    if (!id || !live.current) return;
    live.current = false;
    setRecording(false);
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    const seconds = Math.min(MAX_SECONDS, (Date.now() - startedAt.current) / 1000);
    const uri = recorder.uri;
    if (!uri || seconds < 0.6) return; // toque rápido sem querer não vira áudio
    setSending(true);
    try {
      const blob = await (await fetch(uri)).blob();
      const url = await uploadUrl({ gameId: id as GameId });
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': blob.type || 'audio/m4a' }, body: blob });
      const { storageId } = (await res.json()) as { storageId: Id<'_storage'> };
      await sendAudio({ gameId: id as GameId, audioId: storageId, seconds: Math.max(1, Math.round(seconds)) });
    } catch (e) {
      setError(errorInfo(e).message);
    } finally {
      setSending(false);
    }
  };

  // Um botão só: grava ou envia.
  const toggle = () => (live.current ? stop() : opening ? stop() : start());
  return { start, stop, toggle, recording, opening, sending, error };
}
