import { BOTS } from '@/lib/bots';
import { getSession } from '@/lib/auth';
import './globals.css';

async function readError(searchParams) {
  const error = searchParams?.error || null;
  if (!error) return null;
  return {
    denied: 'Login was cancelled. You can try again whenever you are ready.',
    invalid: 'That login link was invalid or expired. Try again.',
    failed: 'Something went wrong during login. Try again.',
  }[error] || 'Something went wrong. Try again.';
}

export default async function Home({ searchParams }) {
  const session = await getSession().catch(() => null);
  const errorMsg = await readError(searchParams);

  return (
    <>
      <nav className="nav">
        <div className="brand">
          <span className="dot" /> DOMINYX <span className="badge">HQ</span>
        </div>
        {session ? (
          <a className="btn btn-primary btn-sm" href="/dashboard">Open Dashboard</a>
        ) : (
          <a className="btn btn-discord btn-sm" href="/api/auth/login">Login with Discord</a>
        )}
      </nav>

      <header className="hero">
        <h1>Command your Discord network.</h1>
        <p className="sub">
          One dashboard for the whole Dominyx family — Music, Level, Greet, Ticket, Ping and Guard.
          Configure every bot for every server, all in one place.
        </p>
        <div className="hero-cta">
          {session ? (
            <a className="btn btn-primary" href="/dashboard">Open Dashboard</a>
          ) : (
            <a className="btn btn-discord" href="/api/auth/login">Login with Discord</a>
          )}
        </div>
        {errorMsg && <div className="error-banner">⚠️ {errorMsg}</div>}
      </header>

      <section className="section">
        <div className="wrap">
          <h2 className="section-title">The family</h2>
          <p className="section-sub">Six specialists, one command center. Kick each bot into any server, then tune it right here.</p>
          <div className="grid">
            {BOTS.map((bot) => (
              <div key={bot.id} className="card" style={{ ['--card-color']: bot.color }}>
                <div className="emoji">{bot.emoji}</div>
                <div className="tag">{bot.name}</div>
                <h3>{bot.tagline}</h3>
                <p>{bot.description}</p>
                <div className="features">
                  {bot.features.map((f) => (
                    <span key={f} className="pill">{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="notice">
            <strong>Never run a slash command again.</strong> Welcome channels, ticket panels, level roles, 24/7 music, live alerts and moderator settings — all editable from Dominyx HQ.
          </div>
        </div>
      </section>

      <footer className="footer">
        Dominyx Network · a family of single-purpose Discord bots
      </footer>
    </>
  );
}

export const dynamic = 'force-dynamic';