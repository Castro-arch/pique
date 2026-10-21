// Tokens da versão original do design (Claude Design · "Pique - Design das telas").
// Toda cor, medida e fonte das telas sai daqui.

export const colors = {
  // Fundos
  ink: '#101418', // fundo das telas
  inkDeep: '#0B0E11', // telas de resultado e post
  inkNight: '#0C0D10', // telas com ilustração
  inkRaised: '#1A2027', // cards, listas, folhas
  inkSunken: '#141A20', // cards secundários
  inkBorder: '#2A323B',
  inkLine: '#1E252C',
  inkMuted: '#55606B', // ícones e textos desativados

  // Texto
  paper: '#F3F0E8',
  paperMuted: '#A9A79F',
  paperSoft: '#C9C6BD',

  // Corredor e marca
  lime: '#C8F23C',
  limeInk: '#16200A',
  limeTint: '#243014',

  // Caçador, ping e ações de saída
  pink: '#FF2A55',
  pinkInk: '#2A0610',
  pinkTint: '#3A0D17',
  pinkSoft: '#FF8FA8',

  // Avisos (fora da zona, erros)
  amber: '#FFB020',
  amberInk: '#2A1A00',
  amberTint: '#2A1E08',
} as const;

// Ritmo das telas: laterais 20, topo 56, base 34, entre blocos 16.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  screenX: 20,
  screenTop: 56,
  screenBottom: 34,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
} as const;

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyStrong: 'Inter_600SemiBold',
} as const;

// Altura mínima de qualquer alvo de toque.
export const touch = 44;

export type Role = 'runner' | 'hunter';

// Cor de cada papel: o anel do avatar e os selos seguem isto.
export const roleColor: Record<Role, string> = {
  runner: colors.lime,
  hunter: colors.pink,
};
