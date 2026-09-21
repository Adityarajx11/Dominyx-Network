'use client';

import { useEffect, useState } from 'react';
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

export default function DashboardShell({ user, children }) {
  const path = usePathname();
  const guildId = path.startsWith('/dashboard/') ? path.split('/')[2] : null;
  const [openBot, setOpenBot] = useState(null);
  useEffect(() => {
    try {
      setOpenBot(new URLSearchParams(window.location.search).get('bot'));
    } catch {
      setOpenBot(null);
    }
  }, [path]);

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
            // Sidebar never guesses: it carries the bot intent (?bot=) and the
            // server page itself shows config when the bot is there, or the
            // invite state when it isn't. Same tab, no surprises.
            const href = guildId ? `/dashboard/${guildId}?bot=${b.id}` : `/dashboard?bot=${b.id}`;
            const isActive = openBot === b.id;
            return (
              <a
                key={b.id}
                href={href}
                title={`Open ${b.name}`}
                className={`side-link side-bot${isActive ? ' active' : ''}`}
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
