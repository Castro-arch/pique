import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

// Denúncias com mais de 6 meses saem (prazo da Política de privacidade).
crons.daily('apagar denuncias antigas', { hourUTC: 6, minuteUTC: 0 }, internal.reports.prune, {});

// Áudios do rádio que subiram mas nunca viraram mensagem (envio falhou ou abuso).
crons.hourly('apagar audios orfaos', { minuteUTC: 15 }, internal.radio.pruneOrphans, {});

export default crons;
