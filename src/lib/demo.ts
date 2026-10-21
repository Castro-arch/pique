// Dados de demonstração usados pelas telas enquanto o jogo no servidor não existe.
// As fotos são rostos gerados por IA (thispersondoesnotexist.com): ninguém real.

import type { Role } from '@/theme/tokens';

export type DemoPlayer = {
  id: string;
  name: string;
  username: string;
  photo: number;
  role: Role | 'draw';
};

export const photos = {
  castro: require('@/assets/images/demo/castro.jpg'),
  leo: require('@/assets/images/demo/leo.jpg'),
  priya: require('@/assets/images/demo/priya.jpg'),
  sasha: require('@/assets/images/demo/sasha.jpg'),
  teo: require('@/assets/images/demo/teo.jpg'),
  jonah: require('@/assets/images/demo/jonah.jpg'),
} as const;

export const illustrations = {
  achado: require('@/assets/images/ilustracoes/achado.jpg'),
  aguardando: require('@/assets/images/ilustracoes/aguardando.jpg'),
  sobreviveu: require('@/assets/images/ilustracoes/sobreviveu.jpg'),
} as const;

export const me: DemoPlayer = {
  id: 'castro',
  name: 'Castro',
  username: 'castro',
  photo: photos.castro,
  role: 'runner',
};

export const players: DemoPlayer[] = [
  me,
  { id: 'leo', name: 'Leo', username: 'leo', photo: photos.leo, role: 'hunter' },
  { id: 'jonah', name: 'Jonah', username: 'jonah', photo: photos.jonah, role: 'draw' },
  { id: 'priya', name: 'Priya', username: 'priya', photo: photos.priya, role: 'runner' },
  { id: 'teo', name: 'Teo', username: 'teo', photo: photos.teo, role: 'runner' },
  { id: 'sasha', name: 'Sasha', username: 'sasha', photo: photos.sasha, role: 'runner' },
];

export const player = (id: keyof typeof photos) => players.find((p) => p.id === id)!;

export const match = {
  code: 'TACO42',
  round: 1,
  host: 'leo',
  rules: {
    durationMin: 30,
    headStartMin: 3,
    pingEveryMin: 2,
    zoneMeters: 420,
    shrinkEveryMin: 5,
    hunters: 2,
  },
} as const;

// Preços do documento de arquitetura (v2): só o host paga.
export const pricing = {
  freeHostedMatches: 3,
  nightPass: 'R$ 4,90',
  lifetime: 'R$ 34,90',
} as const;
