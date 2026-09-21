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

export default function DashboardShell({ user, children, botsPresent = null, inviteUrls = {}, botServers = {} }) {
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
            const servers = botServers[b.id] || [];
            // Server open: present (or unknown) -> its config tab; absent -> invite.
            // No server open: 1 home -> jump there; several -> pick from submenu; none -> invite page.
            let href = '/invite';
            let external = false;
            if (guildId) {
              if (botsPresent == null || botsPresent[b.id]) {
                href = `/dashboard/${guildId}?bot=${b.id}`;
              } else {
                href = inviteUrls[b.id] || '/invite';
                external = href !== '/invite';
              }
            } else if (servers.length === 1) {
              href = `/dashboard/${servers[0].id}?bot=${b.id}`;
            }
            const configuring = !!guildId && !external;
            const showPicker = !guildId && servers.length > 1;
            const isOpen = expanded === b.id;
            return (
              <div key={b.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <a
                    href={showPicker ? undefined : href}
                    onClick={showPicker ? (e) => { e.preventDefault(); setExpanded(isOpen ? null : b.id); } : undefined}
                    {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                    title={configuring ? `Configure ${b.name}` : (servers.length > 0 || guildId ? `Open ${b.name}` : `Invite ${b.name}`)}
                    className={`side-link side-bot${configuring && openBot === b.id ? ' active' : ''}`}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <span>{b.emoji}</span>{b.name.replace('Dominyx ', '')}
                    <span className="side-dot" style={{ background: b.color, color: b.color }} />
                  </a>
                  {showPicker && (
                    <button
                      className="side-caret"
                      aria-label={`Choose server for ${b.name}`}
                      onClick={() => setExpanded(isOpen ? null : b.id)}
                    >
                      {isOpen ? '▾' : '▸'}
                    </button>
                  )}
                </div>
                {showPicker && isOpen && (
                  <div className="side-sub">
                    {servers.map((s) => (
                      <a key={s.id} href={`/dashboard/${s.id}?bot=${b.id}`} className="side-link side-server">
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
