import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors } from '@/theme/tokens';

// Câmera do navegador lendo QR. Usa o leitor do próprio navegador quando ele
// existe (Chrome no Android) e o jsQR no resto, como o Safari do iPhone, que
// não tem. A lanterna não é controlável no navegador.
type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };

export function QrCamera({ onCode }: { onCode: (text: string) => void; torch: boolean }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<'asking' | 'on' | 'denied' | 'none'>('asking');
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('none');
      return;
    }
    let stream: MediaStream | null = null;
    let stop = false;
    let raf = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const detector = Native ? new Native({ formats: ['qr_code'] }) : null;
    let last = 0;

    const tick = async () => {
      if (stop) return;
      const v = video.current;
      // Lê umas 8 vezes por segundo: suficiente e leve para a bateria.
      if (v && v.readyState >= 2 && performance.now() - last > 120) {
        last = performance.now();
        try {
          let text: string | null = null;
          if (detector) {
            text = (await detector.detect(v))[0]?.rawValue ?? null;
          } else if (ctx) {
            const w = Math.min(640, v.videoWidth);
            const h = Math.round((v.videoHeight / v.videoWidth) * w);
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(v, 0, 0, w, h);
            text = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })?.data ?? null;
          }
          if (text) onCode(text);
        } catch {
          // quadro ruim: tenta no próximo
        }
      }
      raf = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        if (stop) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
        }
        setState('on');
        raf = requestAnimationFrame(tick);
      })
      .catch(() => setState('denied'));

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode, tries]);

  return (
    <View style={styles.fill}>
      <video ref={video} muted playsInline autoPlay style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      {state === 'denied' || state === 'none' ? (
        <View style={[styles.fill, styles.ask]}>
          <Text style={{ textAlign: 'center' }}>
            {state === 'none'
              ? 'Este navegador não deixa usar a câmera. Digite o código da partida.'
              : 'A câmera foi bloqueada. Toque no cadeado ao lado do endereço do site, libere a câmera e tente de novo.'}
          </Text>
          {state === 'denied' ? <Button label="Tentar de novo" onPress={() => setTries((n) => n + 1)} style={{ marginTop: 14, alignSelf: 'stretch' }} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.inkDeep },
  ask: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 120 },
});
