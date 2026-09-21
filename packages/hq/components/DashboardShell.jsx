'use client';

import { usePathname } from 'next/navigation';
import { BOTS } from '@/lib/bots';

function avatarUrl(user) {
  if (user?.avatar && user?.id) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
  }
  return null;
}

const LINKS = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/dashboard', label: 'Servers', icon: '▦' },
  { href: '/invite', label: 'Invite bots', icon: '＋' },
];

export default function DashboardShell({ user, children, botsPresent = null, inviteUrls = {} }) {
  const path = usePathname();
  const guildId = path.startsWith('/dashboard/') ? path.split('/')[2] : null;

  return (
    <div className="dash">
      <aside className="sidebar">
        <a className="brand side-brand" href="/">
          <span className="dot" /> DOMINYX <span className="badge">HQ</span>
        </a>

        <nav className="side-nav">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={`side-link ${path === l.href ? 'active' : ''}`}>
              <span className="side-ico">{l.icon}</span>{l.label}
            </a>
          ))}
        </nav>

        <div className="side-label">BOTS</div>
        <nav className="side-nav side-bots">
          {BOTS.map((b) => {
            const inGuild = !!(guildId && botsPresent && botsPresent[b.id]);
            const href = inGuild
              ? `/dashboard/${guildId}?bot=${b.id}`
              : (guildId && inviteUrls[b.id]) || '/invite';
            const external = !inGuild;
            return (
              <a
                key={b.id}
                href={href}
                {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                title={inGuild ? `Configure ${b.name}` : `Invite ${b.name}`}
                className="side-link side-bot"
              >
                <span>{b.emoji}</span>{b.name.replace('Dominyx ', '')}
                <span className="side-dot" style={{ background: b.color, color: b.color }} />
              </a>
            );
          })}
        </nav>

        <div className="side-foot">
          <div className="side-user">
            <span className="avatar sm">
              {avatarUrl(user) ? <img src={avatarUrl(user)} alt="" /> : (user?.username?.[0] || '—')}
            </span>
            <span className="side-uname">{user?.username || '—'}</span>
          </div>
          <a className="btn btn-ghost btn-sm" href="/api/auth/logout">Log out</a>
        </div>
      </aside>
      <main className="dash-main">{children}</main>
    </div>
  );
}
