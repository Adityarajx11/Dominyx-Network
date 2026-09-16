'use client';

export function SiteNav({ user }) {
  return (
    <nav className="nav">
      <a className="brand" href="/">
        <span className="dot" /> DOMINYX <span className="badge">HQ</span>
      </a>
      <a className="btn btn-ghost btn-sm" href="/api/auth/logout">Log out ({user?.username})</a>
    </nav>
  );
}