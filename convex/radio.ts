import { ConvexError, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, query, type MutationCtx } from './_generated/server';
import { requireMember } from './lib';

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
] as const;
const MAX_AUDIO_S = 15;
const MIN_GAP_MS = 2_000;

// Quem pode falar e em qual canal. Pego só fala se a regra permitir.
async function speaker(ctx: MutationCtx, gameId: Doc<'games'>['_id']) {
  const { game, me } = await requireMember(ctx, gameId);
  if (game.status !== 'headstart' && game.status !== 'hunt') throw new ConvexError('O Radio abre quando a rodada começa.');
  if (!me.role) throw new ConvexError('Você não está nesta rodada.');
  if (me.state === 'caught' && !game.rules.spectatorsHelp) throw new ConvexError('Quem foi pego só assiste nesta partida.');
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
    const { me, team } = await speaker(ctx, gameId);
    await ctx.db.insert('messages', { gameId, playerId: me._id, team, kind: 'quick', text, at: Date.now() });
  },
});

export const uploadUrl = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    await speaker(ctx, gameId);
    return ctx.storage.generateUploadUrl();
  },
});

export const sendAudio = mutation({
  args: { gameId: v.id('games'), audioId: v.id('_storage'), seconds: v.number() },
  handler: async (ctx, { gameId, audioId, seconds }) => {
    const { me, team } = await speaker(ctx, gameId);
    if (seconds <= 0 || seconds > MAX_AUDIO_S) {
      await ctx.storage.delete(audioId);
      throw new ConvexError(`Áudio de até ${MAX_AUDIO_S} s.`);
    }
    await ctx.db.insert('messages', { gameId, playerId: me._id, team, kind: 'audio', audioId, seconds: Math.round(seconds), at: Date.now() });
  },
});

// Canal do meu time + avisos gerais. Espectador ouve o canal dos corredores.
export const list = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const { game, me } = await requireMember(ctx, gameId);
    const team = me.role ?? 'runner';
    const since = game.startedAt ?? 0;
    const rows = await ctx.db
      .query('messages')
      .withIndex('by_game', (q) => q.eq('gameId', gameId).gte('at', since))
      .order('desc')
      .take(150);
    const out = [];
    for (const m of rows.reverse()) {
      if (m.team !== 'all' && m.team !== team) continue;
      const from = m.playerId ? await ctx.db.get(m.playerId) : null;
      out.push({
        id: m._id,
        kind: m.kind,
        text: m.text ?? null,
        seconds: m.seconds ?? null,
        audioUrl: m.audioId ? await ctx.storage.getUrl(m.audioId) : null,
        from: from ? { id: from._id, name: from.name, isMe: from._id === me._id } : null,
        at: m.at,
      });
    }
    return { team, quick: QUICK, messages: out };
  },
});
