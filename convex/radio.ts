import { ConvexError, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { internalMutation, mutation, query, type MutationCtx } from './_generated/server';
import { memberOrNull, requireMember } from './lib';
import { blockedBy } from './reports';

// Sem texto livre: só estas respostas prontas e áudio curto.
export const QUICK = [
  'Achei um!',
  'Cubram o canal',
  'Onde você está?',
  'Tô indo',
  'Perdi de vista',
  'Tô escondido',
  'Ninguém por aqui',
  'Caçador perto!',
  'Me salva!',
] as const;
// O preso sempre pode pedir resgate, mesmo quando pego só assiste.
const HELP = 'Me salva!';
const MAX_AUDIO_S = 15;
const MAX_AUDIO_BYTES = 600_000; // 15 s de voz comprimida cabem com folga
const MIN_GAP_MS = 2_000;

// Quem pode falar e em qual canal. Pego só fala se a regra permitir.
async function speaker(ctx: MutationCtx, gameId: Doc<'games'>['_id'], askingHelp = false) {
  const { game, me } = await requireMember(ctx, gameId);
  if (game.status !== 'headstart' && game.status !== 'hunt') throw new ConvexError('O Radio abre quando a rodada começa.');
  if (!me.role) throw new ConvexError('Você não está nesta rodada.');
  if (me.state === 'caught' && !game.rules.spectatorsHelp && !(askingHelp && me.jail)) throw new ConvexError('Quem foi pego só assiste nesta partida.');
  const last = await ctx.db
    .query('messages')
    .withIndex('by_game', (q) => q.eq('gameId', gameId).gt('at', Date.now() - MIN_GAP_MS))
    .filter((q) => q.eq(q.field('playerId'), me._id))
    .first();
  if (last) throw new ConvexError('Devagar no Radio.');
  return { me, team: me.role };
}

export const sendQuick = mutation({
  args: { gameId: v.id('games'), text: v.string() },
  handler: async (ctx, { gameId, text }) => {
    if (!(QUICK as readonly string[]).includes(text)) throw new ConvexError('Mensagem não permitida.');
    const { me, team } = await speaker(ctx, gameId, text === HELP);
    await ctx.db.insert('messages', { gameId, playerId: me._id, team, kind: 'quick', text, at: Date.now() });
  },
});

// No máximo 40 áudios por pessoa por rodada (cada URL é um upload no armazenamento do projeto).
const MAX_UPLOADS_PER_ROUND = 40;
export const uploadUrl = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const { me } = await speaker(ctx, gameId);
    if ((me.uploads ?? 0) >= MAX_UPLOADS_PER_ROUND) throw new ConvexError('Chega de áudio por esta rodada. Use as respostas prontas.');
    await ctx.db.patch(me._id, { uploads: (me.uploads ?? 0) + 1 });
    return ctx.storage.generateUploadUrl();
  },
});

export const sendAudio = mutation({
  args: { gameId: v.id('games'), audioId: v.id('_storage'), seconds: v.number() },
  handler: async (ctx, { gameId, audioId, seconds }) => {
    const { me, team } = await speaker(ctx, gameId);
    // Um arquivo já usado por outra mensagem não pode ser reenviado (nem apagado) por outra pessoa.
    // em qualquer partida: um arquivo já ligado a uma mensagem não é reenviado nem apagado por ninguém
    const used = await ctx.db.query('messages').withIndex('by_audio', (q) => q.eq('audioId', audioId)).first();
    if (used) throw new ConvexError('Áudio inválido.');
    // Só áudio de verdade e pequeno (o rádio grava poucos segundos).
    const file = await ctx.db.system.get(audioId);
    const bad = !file || !(file.contentType ?? '').startsWith('audio/') || file.size > MAX_AUDIO_BYTES;
    if (bad || !Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_AUDIO_S) {
      if (file) await ctx.storage.delete(audioId);
      throw new ConvexError(bad ? 'Áudio inválido.' : `Áudio de até ${MAX_AUDIO_S} s.`);
    }
    await ctx.db.insert('messages', { gameId, playerId: me._id, team, kind: 'audio', audioId, seconds: Math.round(seconds), at: Date.now() });
  },
});

// Canal do meu time + avisos gerais. Espectador ouve o canal dos corredores.
export const list = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const member = await memberOrNull(ctx, gameId);
    if (!member) return { team: 'runner' as const, quick: QUICK, messages: [] }; // saiu da partida
    const { game, me } = member;
    const team = me.role ?? 'runner';
    const since = game.startedAt ?? 0;
    const rows = await ctx.db
      .query('messages')
      .withIndex('by_game', (q) => q.eq('gameId', gameId).gte('at', since))
      .order('desc')
      .take(150);
    const hidden = await blockedBy(ctx, me.userId); // quem eu bloqueei some do meu rádio
    const out = [];
    for (const m of rows.reverse()) {
      if (m.team !== 'all' && m.team !== team) continue;
      const from = m.playerId ? await ctx.db.get(m.playerId) : null;
      if (from && hidden.has(from.userId)) continue;
      out.push({
        id: m._id,
        kind: m.kind,
        text: m.text ?? null,
        seconds: m.seconds ?? null,
        audioUrl: m.audioId ? await ctx.storage.getUrl(m.audioId) : null,
        from: from ? { id: from._id, name: from.name, isMe: from._id === me._id, frame: (await ctx.db.get(from.userId))?.frame ?? null } : null,
        at: m.at,
      });
    }
    return { team, quick: QUICK, messages: out };
  },
});

// Faxina (crons.ts): arquivo enviado há mais de 1 h que nenhuma mensagem usa.
// shortcut: o armazenamento só guarda áudio do rádio; se um dia guardar outra coisa (fotos), esta faxina precisa saber disso.
export const pruneOrphans = internalMutation({
  args: {},
  handler: async (ctx) => {
    const old = await ctx.db.system
      .query('_storage')
      .filter((q) => q.lt(q.field('_creationTime'), Date.now() - 60 * 60 * 1000))
      .take(200);
    for (const f of old) {
      const used = await ctx.db.query('messages').withIndex('by_audio', (q) => q.eq('audioId', f._id)).first();
      if (!used) await ctx.storage.delete(f._id);
    }
  },
});
