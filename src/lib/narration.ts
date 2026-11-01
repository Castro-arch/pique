// Narração do Como jogar no app nativo (ainda não lançado): por enquanto muda.
// O site usa narration.web.ts.
export const NARRATION: { src: number; ms: number }[] = [];

export function playNarration(_step: number) {}
export function pauseNarration() {}
export function resumeNarration() {}
export function stopNarration() {}
export function narrationPosition(_step: number): number | null {
  return null;
}
export function onNarrationEnd(_cb: (step: number) => void) {
  return () => {};
}
export function narrationOn() {
  return false;
}
export function setNarrationOn(_on: boolean) {}
