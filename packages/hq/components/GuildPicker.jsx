'use client';

import { useRouter } from 'next/navigation';

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
            <div key={g.id} className="server-card" onClick={() => router.push(`/dashboard/${g.id}`)}>
              <div className="server-row">
                <div className="avatar">
                  {iconUrl(g) ? <img src={iconUrl(g)} alt={g.name} /> : g.name[0]}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="server-name">{g.name}</div>
                  <div className="server-sub">Manage</div>
                </div>
              </div>
              {g.hasBot ? (
                <span className="status status-ok">✓ Bot ready</span>
              ) : (
                <span className="status status-missing">✗ No Dominyx bot invited</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}