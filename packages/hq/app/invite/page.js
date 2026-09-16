import { BOTS } from '@/lib/bots';
import { getInviteUrl, getPermissionLabels } from '@/lib/invite';

export const dynamic = 'force-dynamic';

export default async function InvitePage() {
  return (
    <>
      <nav className="nav">
        <a className="brand" href="/">
          <span className="dot" /> DOMINYX <span className="badge">HQ</span>
        </a>
        <a className="btn btn-ghost btn-sm" href="/">← Back to home</a>
      </nav>

      <header className="hero">
        <h1>
          Invite the family
          <span className="accent">Add a bot in three clicks.</span>
        </h1>
        <p className="sub">
          Pick a bot, choose your server, review what it can do, and authorize.
          Discord walks you through the whole thing — no setup on your side.
        </p>
      </header>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="notice">
            <strong>How it works:</strong> click <span style={{ color: 'var(--text)', fontWeight: 700 }}>Add to Discord</span> →
            pick which server → check the permissions it needs → authorize. The bot lands in your server instantly.
          </div>

          <div className="grid">
            {BOTS.map((bot) => {
              const url = getInviteUrl(bot.id);
              const perms = getPermissionLabels(bot.id);
              return (
                <div key={bot.id} className="card" style={{ ['--card-color']: bot.color, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div className="emoji">{bot.emoji}</div>
                    <div className="tag">{bot.name}</div>
                  </div>
                  <h3 style={{ marginTop: 8 }}>{bot.tagline}</h3>
                  <p>{bot.description}</p>

                  <div className="features" style={{ marginBottom: 16 }}>
                    {bot.features.map((f) => (
                      <span key={f} className="pill">{f}</span>
                    ))}
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    <div className="pill" style={{ marginBottom: 8, color: 'var(--text-dim)' }}>
                      Will have access to:
                    </div>
                    <ul style={{ margin: '0 0 16px', paddingLeft: 18, fontSize: 13, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {perms.map((p) => <li key={p}>{p}</li>)}
                    </ul>

                    {url ? (
                      <a className="btn btn-discord" href={url} target="_blank" rel="noreferrer" style={{ width: '100%', justifyContent: 'center' }}>
                        Add to Discord
                      </a>
                    ) : (
                      <div style={{ fontSize: 12.5, color: '#ff90a6', background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.4)', borderRadius: 10, padding: '10px 12px' }}>
                        Invite not configured yet — set <code style={{ color: '#fff' }}>BOT_ID_{bot.id.toUpperCase()}</code> in the HQ environment.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="footer">
        Dominyx Network · invite a bot, then manage it from the dashboard
      </footer>
    </>
  );
}