// Molduras (cosméticos): as cores do anel em volta da foto. Só visual.
export const FRAMES: Record<string, { colors: [string, string, ...string[]]; glow?: string; preview: string }> = {
  neon: { colors: ['#C8F23C', '#E6FF8A', '#C8F23C'], glow: '#C8F23C', preview: 'Brilha em verde no escuro.' },
  arcoiris: { colors: ['#FF2A55', '#FFB020', '#C8F23C', '#5AC8FA', '#B57CFF'], preview: 'Todas as cores do Pique.' },
  gelo: { colors: ['#BFF4FF', '#5AC8FA', '#E8FBFF', '#5AC8FA'], glow: '#5AC8FA', preview: 'Azul gelado, com brilho frio.' },
  chamas: { colors: ['#FF2A55', '#FFB020', '#FFE27A', '#FF2A55'], glow: '#FF7828', preview: 'Fogo em volta da foto.' },
  ouro: { colors: ['#FFE9A8', '#FFB020', '#9A6200', '#FFD66B'], glow: '#FFB020', preview: 'Para quem já ganhou muita rodada.' },
};
