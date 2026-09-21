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

export default function DashboardShell({ user, children, botsPresent = null, inviteUrls = {}, servers = [], botServers = {} }) {
  const path = usePathname();
  const guildId = path.startsWith('/dashboard/') ? path.split('/')[2] : null;
  const [openBot, setOpenBot] = useState(null);
  const [expanded, setExpanded] = useState(null);
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
            // Picker lists only servers actually holding this bot.
            // Nowhere -> plain invite link. Single home -> jump straight in.
            const homes = botServers[b.id] || [];
            const isOpen = expanded === b.id;
            const configuring = !!guildId && openBot === b.id;
            if (homes.length === 0) {
              return (
                <a
                  key={b.id}
                  href="/invite"
                  title={`Invite ${b.name}`}
                  className="side-link side-bot"
                >
                  <span>{b.emoji}</span>{b.name.replace('Dominyx ', '')}
                  <span className="side-dot" style={{ background: b.color, color: b.color }} />
                </a>
              );
            }
            return (
              <div key={b.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <a
                    href={`/dashboard/${homes[0].id}?bot=${b.id}`}
                    title={homes.length > 1 ? `Choose server for ${b.name}` : `Open ${b.name} in ${homes[0].name}`}
                    className={`side-link side-bot${configuring ? ' active' : ''}`}
                    style={{ flex: 1, minWidth: 0 }}
                    onClick={homes.length > 1 ? (e) => { e.preventDefault(); setExpanded(isOpen ? null : b.id); } : undefined}
                  >
                    <span>{b.emoji}</span>{b.name.replace('Dominyx ', '')}
                    <span className="side-dot" style={{ background: b.color, color: b.color }} />
                  </a>
                  {homes.length > 1 && (
                    <button
                      className="side-caret"
                      aria-label={`Choose server for ${b.name}`}
                      onClick={() => setExpanded(isOpen ? null : b.id)}
                    >
                      {isOpen ? '▾' : '▸'}
                    </button>
                  )}
                </div>
                {homes.length > 1 && isOpen && (
                  <div className="side-sub">
                    {homes.map((s) => (
                      <a
                        key={s.id}
                        href={`/dashboard/${s.id}?bot=${b.id}`}
                        className={`side-link side-server${guildId === s.id ? ' active' : ''}`}
                      >
                        {s.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
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
