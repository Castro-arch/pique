import { useMutation } from 'convex/react';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useRef, useState } from 'react';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { errorInfo, type GameId } from './game';

const MAX_SECONDS = 15; // o servidor recusa áudio maior

// Segurar para falar: grava enquanto o dedo está no botão e, ao soltar,
// manda o arquivo para o armazenamento do Convex (apagado no fim da rodada).
export function useTalk(id: string | undefined) {
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const uploadUrl = useMutation(api.radio.uploadUrl);
  const sendAudio = useMutation(api.radio.sendAudio);
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(0);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref e não estado: o corte de 15 s chama stop() de dentro de um timer.
  const live = useRef(false);

  const start = async () => {
    if (!id || live.current || sending) return;
    setError(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return setError('Libere o microfone para falar no Radio.');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    startedAt.current = Date.now();
    live.current = true;
    setRecording(true);
    limit.current = setTimeout(() => void stop(), MAX_SECONDS * 1000);
  };

  const stop = async () => {
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

  return { start, stop, recording, sending, error };
}
