import { requireGuildAccess } from '@/lib/auth';
import { SiteNav } from '@/components/SiteNav';
import GuildConfig from '@/components/GuildConfig';
import { BOTS } from '@/lib/bots';
import { getInviteUrl } from '@/lib/invite';

function iconUrl(guild, size = 128) {
  return guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=${size}` : null;
}

export default async function GuildPage({ params }) {
  const guildId = params.guildId;
  let access;
  try {
    access = await requireGuildAccess(guildId);
  } catch (err) {
    access = { error: err.message };
  }

  return (
    <>
      <SiteNav user={access.user || { username: '—' }} />
      <div className="page-head">
        <div className="crumbs">
          <a href="/dashboard" style={{ color: 'var(--violet)' }}>← Back to servers</a>
        </div>
        <h1>
          {access.guild ? (
            <>
              <span className="avatar" style={{ width: 36, height: 36, borderRadius: 9, display: 'inline-flex', marginRight: 10, verticalAlign: 'middle' }}>
                {iconUrl(access.guild) ? <img src={iconUrl(access.guild)} alt="" /> : access.guild.name[0]}
              </span>
              {access.guild.name}
            </>
          ) : 'Configure server'}
        </h1>
      </div>

      {access.error ? (
        <div className="wrap">
          <div className="notice">
            <strong>{access.error}</strong>
            <div style={{ marginTop: 12 }}>
              <a className="btn btn-primary btn-sm" href="/dashboard">Pick another server</a>
            </div>
          </div>
        </div>
      ) : access.hasBot ? (
        <GuildConfig guildId={guildId} />
      ) : (
        <div className="wrap">
          <div className="notice">
            <strong>No Dominyx bot here yet.</strong>
            <div style={{ marginTop: 4 }}>Invite one to add it to this server, then refresh to configure it.</div>
          </div>
          <div className="invite-links" style={{ marginTop: 20 }}>
            {BOTS.map((bot) => {
              const url = getInviteUrl(bot.id);
              if (!url) return null;
              return (
                <a key={bot.id} className="btn btn-discord" href={url} target="_blank" rel="noreferrer">
                  {bot.emoji} Add {bot.name}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

export const dynamic = 'force-dynamic';