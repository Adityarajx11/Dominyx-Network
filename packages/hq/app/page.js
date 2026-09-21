import { BOTS } from '@/lib/bots';
import { getSession } from '@/lib/auth';
import { getInviteUrl } from '@/lib/invite';
import LoginButton from '@/components/LoginButton';

async function readError(searchParams) {
  const error = searchParams?.error || null;
  if (!error) return null;
  return {
    denied: 'Login was cancelled. You can try again whenever you are ready.',
    invalid: 'That login attempt expired (usually from clicking Login twice). Please try again, one click.',
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
          <div style={{ display: 'flex', gap: 10 }}>
            <a className="btn btn-primary btn-sm" href="/dashboard">Open Dashboard</a>
            <a className="btn btn-ghost btn-sm" href="/api/auth/logout">Log out</a>
          </div>
        ) : (
          <LoginButton className="btn btn-discord btn-sm">Login with Discord</LoginButton>
        )}
      </nav>

      <header className="hero">
        <div className="hero-rings" aria-hidden="true"><span /><span /><span /></div>
        <div className="hero-ghost" aria-hidden="true">DOMINYX</div>
        <div className="hero-badge"><span className="pulse-dot" />6 bots live · Free during beta</div>
        <h1>
          DOMINYX
          <span className="accent">Command your Discord network.</span>
        </h1>
        <p className="sub">
          Six bots. One command center. Invite Music, Level, Greet, Ticket, Ping and Guard into any
          server, then configure every one of them right here — no slash commands needed.
        </p>
        <div className="hero-cta">
          {session ? (
            <a className="btn btn-primary" href="/dashboard">Open Dashboard</a>
          ) : (
            <LoginButton className="btn btn-discord">Login with Discord</LoginButton>
          )}
        </div>
        <div className="hero-chips">
          {BOTS.map((bot) => (
            <a key={bot.id} className="hero-chip" href="#family" title={bot.name}>{bot.emoji}</a>
          ))}
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><strong>6</strong><span>Specialist bots</span></div>
          <div className="hero-stat"><strong>27</strong><span>Slash commands</span></div>
          <div className="hero-stat"><strong>1</strong><span>Command center</span></div>
          <div className="hero-stat"><strong>0</strong><span>Setup needed</span></div>
        </div>
        {errorMsg && <div className="error-banner">⚠️ {errorMsg}</div>}
      </header>

      <section className="section" id="family" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <h2 className="section-title">Meet the family</h2>
          <p className="section-sub">Six specialists, one network — each built for a single job, tuned to perfection.</p>
          <div className="grid">
            {BOTS.map((bot) => (
              <div key={bot.id} className="card-halo" style={{ ['--card-color']: bot.color }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div className="emoji">{bot.emoji}</div>
                  <div className="tag">{bot.name}</div>
                </div>
                <h3>{bot.tagline}</h3>
                <p>{bot.description}</p>
                <div className="features">
                  {bot.features.map((f) => (
                    <span key={f} className="pill">{f}</span>
                  ))}
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <a
                    className="btn btn-discord btn-sm"
                    href={getInviteUrl(bot.id) || '/invite'}
                    target="_blank"
                    rel="noreferrer"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
                  >
                    Add to Discord
                  </a>
                </div>
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

      <section className="section">
        <div className="wrap">
          <div className="cta-panel">
            <h2>Ready to command your server?</h2>
            <p>Invite the family, open your dashboard, and configure every bot in minutes — free while in beta.</p>
            {session ? (
              <a className="btn btn-primary" href="/dashboard">Open Dashboard</a>
            ) : (
              <LoginButton className="btn btn-discord">Login with Discord</LoginButton>
            )}
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