'use client';

import { useRouter } from 'next/navigation';

function iconUrl(guild, size = 128) {
  return guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=${size}`
    : null;
}

export default function GuildPicker({ guilds, bot = null, botName = null, detectionOn = true, inviteUrls = {} }) {
  const router = useRouter();
  const openGuild = (id) => router.push(bot ? `/dashboard/${id}?bot=${bot}` : `/dashboard/${id}`);
  const shortName = botName ? botName.replace('Dominyx ', '') : 'this bot';
  const inviteUrl = bot ? inviteUrls[bot] : null;

  return (
    <div className="wrap">
      <h1>{botName ? `${botName} — pick a server` : 'Your servers'}</h1>
      <p className="section-sub">
        {botName
          ? 'Every server below opens straight into this bot — config if it lives there, an Add button if it doesn’t.'
          : 'Pick a server to configure. Servers need at least one Dominyx bot invited before you can edit them.'}
      </p>
      {!detectionOn && (
        <div className="notice" style={{ marginBottom: 18 }}>
          <strong>Bot auto-detect is off</strong> (bot tokens aren’t set on the server).
          Badges may say “no bot” even where one lives — just open the server, the config or invite shows correctly inside.
        </div>
      )}

      {guilds.length === 0 ? (
        <div className="empty">
          We couldn't find any servers you can manage. Make sure you're admin or have Manage Server permission on at least one server, and that a Dominyx bot is in it.
        </div>
      ) : (
        <div className="server-grid">
          {guilds.map((g) => {
            const absent = bot && detectionOn && !g.hasBot;
            const canOfferInvite = absent && inviteUrl;
            return (
              <div key={g.id} className={`server-card glass${absent ? ' is-absent' : ''}`} onClick={() => openGuild(g.id)}>
                <div className="server-row">
                  <div className="avatar">
                    {iconUrl(g) ? <img src={iconUrl(g)} alt={g.name} /> : g.name[0]}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="server-name">{g.name}</div>
                    <div className="server-sub">
                      {g.hasBot ? 'Manage config' : (absent ? 'Not in this server — add it' : (detectionOn ? 'No Dominyx bot yet' : 'Tap to open'))}
                    </div>
                  </div>
                </div>
                {g.hasBot ? (
                  <span className="status status-ok">✓ {botName ? `${shortName} ready` : 'Bot ready'}</span>
                ) : absent ? (
                  canOfferInvite ? (
                    <a className="btn btn-discord btn-sm server-invite" href={inviteUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                      ＋ Add {shortName}
                    </a>
                  ) : (
                    <span className="status status-missing">✗ Add {shortName} to configure</span>
                  )
                ) : (
                  <span className="status status-missing">{detectionOn ? '✗ Invite a bot to configure' : '○ Open server'}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}