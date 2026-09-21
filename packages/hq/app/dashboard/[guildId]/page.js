import { requireGuildAccess } from '@/lib/auth';
import DashboardShell from '@/components/DashboardShell';
import GuildConfig from '@/components/GuildConfig';
import { getBotsInGuild } from '@/lib/discord';
import { BOTS } from '@/lib/bots';
import { getInviteUrl } from '@/lib/invite';

function iconUrl(guild, size = 128) {
  return guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=${size}` : null;
}

export default async function GuildPage({ params, searchParams }) {
  const guildId = params.guildId;
  let access;
  try {
    access = await requireGuildAccess(guildId);
  } catch (err) {
    access = { error: err.message };
  }

  let botsPresent = null;
  if (access.token && access.guild) {
    try {
      botsPresent = await getBotsInGuild(guildId, access.token);
    } catch {}
  }

  // False when BOT_TOKEN_* aren't set: badges/presence can't be trusted,
  // so the UI says so instead of misrouting.
  const detectionOn = ['MUSIC', 'LEVEL', 'GREET', 'TICKET', 'PING', 'GUARD']
    .some((k) => !!process.env[`BOT_TOKEN_${k}`]);

  const inviteUrls = {};
  for (const bot of BOTS) {
    inviteUrls[bot.id] = getInviteUrl(bot.id);
  }

  return (
    <DashboardShell user={access.user || { username: '—' }}>
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
      ) : (
        <>
          {!detectionOn ? (
            <div className="wrap" style={{ paddingBottom: 0 }}>
              <div className="notice">
                <strong>Bot auto-detect is off</strong> (bot tokens aren’t set on the server).
                All bots are shown below — the ones actually here will load, the rest show invite buttons.
              </div>
            </div>
          ) : (
            !access.hasBot && (
              <div className="wrap" style={{ paddingBottom: 0 }}>
                <div className="notice">
                  <strong>Tip:</strong> a Dominyx bot isn't in this server yet — invite one from the home page. Settings saved here will apply as soon as a bot joins.
                </div>
              </div>
            )
          )}
          <GuildConfig guildId={guildId} botsPresent={botsPresent} inviteUrls={inviteUrls} initialBot={searchParams?.bot || null} />
        </>
      )}
    </DashboardShell>
  );
}

export const dynamic = 'force-dynamic';