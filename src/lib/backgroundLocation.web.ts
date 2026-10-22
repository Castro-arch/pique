// No navegador não existe envio com a tela bloqueada: o jogo usa a
// geolocalização do navegador enquanto a aba está aberta (veja useSendPosition).
export async function startBackgroundTracking(_gameId: string): Promise<boolean> {
  return false;
}

export async function stopBackgroundTracking() {}
