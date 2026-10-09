const { getManager, takeOpenPlay } = require('../lib/lavalink');
const { finishPlay } = require('../lib/history');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    try {
      // Requester left voice mid-song: stop their listened clock as skipped.
      const wasIn = !!oldState.channelId;
      const nowIn = !!newState.channelId;
      if (!wasIn || nowIn) return;
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;
      const guildId = (newState.guild || oldState.guild)?.id;
      if (!guildId) return;

      let player;
      try {
        player = getManager()?.getPlayer(guildId);
      } catch {
        return;
      }
      const cur = player?.queue?.current;
      if (!cur || cur.requesterId !== member.id) return;

      const id = takeOpenPlay(guildId);
      if (!id) return;
      const posSec = Math.round((player.position || 0) / 1000);
      const durSec = Math.round((cur.info?.duration || 0) / 1000);
      await finishPlay(id, {
        listenedSec: durSec > 0 ? Math.min(posSec, durSec) : posSec,
        status: 'skipped',
      });
    } catch {}
  },
};
