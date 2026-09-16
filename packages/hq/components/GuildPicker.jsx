'use client';

import { useRouter } from 'next/navigation';
import { BOTS } from '@/lib/bots';
import { getInviteUrl } from '@/lib/invite';

function iconUrl(guild, size = 128) {
  return guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=${size}`
    : null;
}

export default function GuildPicker({ guilds }) {
  const router = useRouter();

  return (
    <div className="wrap">
      <h1>Your servers</h1>
      <p className="section-sub">Pick a server to configure. Servers need at least one Dominyx bot invited before you can edit them.</p>

      {guilds.length === 0 ? (
        <div className="empty">
          We couldn't find any servers you can manage. Make sure you're admin or have Manage Server permission on at least one server, and that a Dominyx bot is in it.
        </div>
      ) : (
        <div className="server-grid">
          {guilds.map((g) => (
            <div key={g.id} className="server-card">
              <div className="server-row" onClick={() => g.hasBot && router.push(`/dashboard/${g.id}`)} style={{ cursor: g.hasBot ? 'pointer' : 'default' }}>
                <div className="avatar">
                  {iconUrl(g) ? <img src={iconUrl(g)} alt={g.name} /> : g.name[0]}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="server-name">{g.name}</div>
                  <div className="server-sub">{g.hasBot ? 'Manage' : 'Ready to invite'}</div>
                </div>
              </div>
              {g.hasBot ? (
                <span className="status status-ok">✓ Bot ready</span>
              ) : (
                <div className="invite-links">
                  {BOTS.map((bot) => {
                    const url = getInviteUrl(bot.id);
                    if (!url) return null;
                    return (
                      <a key={bot.id} className="btn btn-discord btn-sm" href={url} target="_blank" rel="noreferrer">
                        {bot.emoji} Add {bot.name.replace('Dominyx ', '')}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}