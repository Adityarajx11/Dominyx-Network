'use client';

import { useEffect, useState, useCallback } from 'react';
import { BOTS } from '@/lib/bots';
import { Field, Toggle, Select, SaveBar } from './ui';

const TEXT_TYPES = [0, 5];
const CATEGORY_TYPE = 4;

export default function GuildConfig({ guildId, guildName = '', botsPresent = {}, inviteUrls = {}, initialBot = null }) {
  const [data, setData] = useState(null);
  const validInitial = initialBot && BOTS.some((b) => b.id === initialBot) ? initialBot : null;
  const [active, setActive] = useState(validInitial || 'music');
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialBot && BOTS.some((b) => b.id === initialBot)) setActive(initialBot);
  }, [initialBot]);

  const presentBots = botsPresent ? BOTS.filter((b) => botsPresent[b.id]) : BOTS;
  const absentBots = botsPresent ? BOTS.filter((b) => !botsPresent[b.id]) : [];
  const isPresent = (id) => !botsPresent || botsPresent[id];
  const activeBot = BOTS.find((b) => b.id === active);

  useEffect(() => {
    if (presentBots.length > 0 && !presentBots.find((b) => b.id === active)) {
      setActive(presentBots[0].id);
    }
  }, [presentBots.length]);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/guild/${guildId}/config`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load');
      }
      const json = await res.json();
      setData(json);
      setError(null);
      setRevision((r) => r + 1);
    } catch (err) {
      setError(err.message);
    }
  }, [guildId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  if (error) {
    return (
      <div className="wrap">
        <div className="notice">
          <strong>{error}</strong>
          <div style={{ marginTop: 12 }}>
            <a className="btn btn-primary btn-sm" href="/dashboard">Back to servers</a>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="loading">Loading server config…</div>;
  }

  const meta = {
    textChannels: data.channels.filter((c) => TEXT_TYPES.includes(c.type)).map((c) => ({ value: c.id, label: `#${c.name}` })),
    categories: data.channels.filter((c) => c.type === CATEGORY_TYPE).map((c) => ({ value: c.id, label: c.name })),
    roles: data.roles.map((r) => ({ value: r.id, label: r.name })),
    roleNames: Object.fromEntries(data.roles.map((r) => [r.id, r.name])),
    channelNames: Object.fromEntries(data.channels.map((c) => [c.id, `#${c.name}`])),
  };

  return (
    <div className="wrap">
      <div className="notice">
        Changes here apply <strong>instantly</strong> — the bots read their config from the database at runtime. No restart needed.
      </div>
      <div>
        <div className="panel glass" style={{ ['--panel-color']: BOTS.find((b) => b.id === active)?.color }}>
          {presentBots.length === 0 ? (
            <div className="empty">No Dominyx bots are in this server yet. Invite one from the home page to get started.</div>
          ) : activeBot && !isPresent(activeBot.id) ? (
            <div>
              <PanelHeader botId={activeBot.id} />
              <div className="absent-cta">
                <p><strong>{activeBot.name}</strong> isn’t in <strong>{guildName || 'this server'}</strong> yet.</p>
                <p className="muted">Add it below — its full config unlocks here as soon as it joins.</p>
                {inviteUrls[activeBot.id] ? (
                  <a className="btn btn-discord" href={inviteUrls[activeBot.id]} target="_blank" rel="noreferrer">
                    {activeBot.emoji} Add {activeBot.name} to Discord
                  </a>
                ) : (
                  <a className="btn btn-primary" href="/invite">Choose a server to invite</a>
                )}
              </div>
            </div>
          ) : (
            <>
              {active === 'music' && isPresent('music') && <MusicPanel key={revision} cfg={data.configs.music} meta={meta} onRefresh={loadConfig} guildId={guildId} />}
              {active === 'level' && isPresent('level') && <LevelPanel key={revision} cfg={data.configs.level} meta={meta} onRefresh={loadConfig} guildId={guildId} />}
              {active === 'greet' && isPresent('greet') && <GreetPanel key={revision} cfg={data.configs.greet} meta={meta} onRefresh={loadConfig} guildId={guildId} />}
              {active === 'ticket' && isPresent('ticket') && <TicketPanel key={revision} cfg={data.configs.ticket} meta={meta} onRefresh={loadConfig} guildId={guildId} />}
              {active === 'ping' && isPresent('ping') && <PingPanel key={revision} cfg={data.configs.ping} meta={meta} onRefresh={loadConfig} guildId={guildId} />}
              {active === 'guard' && isPresent('guard') && <GuardPanel key={revision} cfg={data.configs.guard} meta={meta} onRefresh={loadConfig} guildId={guildId} />}
            </>
          )}
          {absentBots.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Add more bots</h3>
              <div className="invite-links">
                {absentBots.map((bot) => {
                  const url = inviteUrls[bot.id];
                  if (!url) return null;
                  return (
                    <a key={bot.id} className="btn btn-discord btn-sm" href={url} target="_blank" rel="noreferrer">
                      {bot.emoji} Add {bot.name.replace('Dominyx ', '')}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function usePusher(guildId, onRefresh) {
  const [state, setState] = useState('idle');
  const [msg, setMsg] = useState(null);

  const push = async (bot, op, bodyData) => {
    setState('saving');
    setMsg(null);
    try {
      const res = await fetch(`/api/guild/${guildId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot, op, data: bodyData }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      setState('saved');
      onRefresh();
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      setState('error');
      setMsg(err.message);
    }
  };

  const clear = () => setMsg(null);
  return { push, state, msg, clear };
}

function PanelHeader({ botId }) {
  const bot = BOTS.find((b) => b.id === botId);
  return (
    <div className="panel-hero">
      <span className="panel-emoji">{bot.emoji}</span>
      <div>
        <h2>{bot.name}</h2>
        <p className="panel-desc">{bot.description}</p>
      </div>
    </div>
  );
}

/* ---------------- Music ---------------- */
function MusicPanel({ cfg, meta, onRefresh, guildId }) {
  const { push, state } = usePusher(guildId, onRefresh);
  const [stay247, setStay247] = useState(cfg.stay247);
  const [defaultVolume, setDefaultVolume] = useState(cfg.defaultVolume ?? 100);
  const [djRoleId, setDjRoleId] = useState(cfg.djRoleId || '');
  const [maxQueue, setMaxQueue] = useState(cfg.maxQueue ?? 50);
  const [leaveTimeoutMinutes, setLeaveTimeoutMinutes] = useState(cfg.leaveTimeoutMinutes ?? 5);
  const [announceChannelId, setAnnounceChannelId] = useState(cfg.announceChannelId || '');

  const save = () => push('music', 'settings', {
    stay247,
    defaultVolume: Math.min(200, Math.max(0, Number(defaultVolume) || 100)),
    djRoleId: djRoleId || null,
    maxQueue: Math.min(500, Math.max(1, Number(maxQueue) || 50)),
    leaveTimeoutMinutes: Math.min(120, Math.max(1, Number(leaveTimeoutMinutes) || 5)),
    announceChannelId: announceChannelId || null,
  });

  return (
    <div>
      <PanelHeader botId="music" />
      <Field hint="Keeps the bot in your voice channel 24/7 and resumes playing the queue after downtime.">
        <Toggle checked={stay247} onChange={setStay247} label="Enable 24/7 mode" />
      </Field>
      <div className="form-row">
        <Field label="Default volume" hint="0–200. Applied to every new session.">
          <input type="number" min="0" max="200" value={defaultVolume} onChange={(e) => setDefaultVolume(e.target.value)} />
        </Field>
        <Field label="Max queue size" hint="1–500 songs.">
          <input type="number" min="1" max="500" value={maxQueue} onChange={(e) => setMaxQueue(e.target.value)} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="DJ role" hint="Only this role (+ admins) can control music. Empty = everyone.">
          <Select value={djRoleId} onChange={setDjRoleId} options={meta.roles} placeholder="No DJ role (everyone)" />
        </Field>
        <Field label="Announce channel" hint="Now-playing posts go here. Empty = command channel.">
          <Select value={announceChannelId} onChange={setAnnounceChannelId} options={meta.textChannels} placeholder="Command channel (default)" />
        </Field>
      </div>
      <Field label="Empty-queue leave timeout (minutes)" hint="How long to wait before leaving voice. 24/7 mode ignores this.">
        <input type="number" min="1" max="120" value={leaveTimeoutMinutes} onChange={(e) => setLeaveTimeoutMinutes(e.target.value)} />
      </Field>
      <SaveBar state={state} onSave={save} />
    </div>
  );
}

/* ---------------- Level ---------------- */
function LevelPanel({ cfg, meta, onRefresh, guildId }) {
  const { push, state } = usePusher(guildId, onRefresh);
  const [channelId, setChannelId] = useState(cfg.channel_id || '');
  const [messageTemplate, setMessageTemplate] = useState(cfg.message_template || '');
  const [xpMin, setXpMin] = useState(cfg.xp_min ?? 15);
  const [xpMax, setXpMax] = useState(cfg.xp_max ?? 25);
  const [cooldownSeconds, setCooldownSeconds] = useState(cfg.cooldown_seconds ?? 60);
  const [roleStack, setRoleStack] = useState(cfg.role_stack ?? true);
  const [ignoredChannels, setIgnoredChannels] = useState(cfg.ignored_channels || []);
  const [ignoredRoles, setIgnoredRoles] = useState(cfg.ignored_roles || []);
  const [newLevel, setNewLevel] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newIgnoredChannel, setNewIgnoredChannel] = useState('');
  const [newIgnoredRole, setNewIgnoredRole] = useState('');

  const saveSettings = () => push('level', 'settings', {
    channelId: channelId || null,
    messageTemplate,
    xpMin: Math.max(1, Number(xpMin) || 15),
    xpMax: Math.max(Number(xpMin) || 15, Number(xpMax) || 25),
    cooldownSeconds: Math.max(0, Number(cooldownSeconds) || 0),
    ignoredChannels,
    ignoredRoles,
    roleStack,
  });

  return (
    <div>
      <PanelHeader botId="level" />
      <div className="form-row">
        <Field label="Announcement channel" hint="Where level-up messages are posted.">
          <Select value={channelId} onChange={setChannelId} options={meta.textChannels} placeholder="Message channel (default)" />
        </Field>
        <Field label="Level-up message" hint="Placeholders: {user} and {level}">
          <textarea value={messageTemplate} onChange={(e) => setMessageTemplate(e.target.value)} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="XP per message (min)" hint="Random XP rolls between min and max.">
          <input type="number" min="1" value={xpMin} onChange={(e) => setXpMin(e.target.value)} />
        </Field>
        <Field label="XP per message (max)">
          <input type="number" min="1" value={xpMax} onChange={(e) => setXpMax(e.target.value)} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Cooldown (seconds)" hint="0 = no cooldown.">
          <input type="number" min="0" value={cooldownSeconds} onChange={(e) => setCooldownSeconds(e.target.value)} />
        </Field>
        <Field hint="Off = keep only the highest earned role.">
          <Toggle checked={roleStack} onChange={setRoleStack} label="Stack level roles" />
        </Field>
      </div>
      <SaveBar state={state} onSave={saveSettings} />

      <h3 style={{ marginTop: 32 }}>Level roles</h3>
      <div className="rows">
        {cfg.roles.length === 0 && <div className="empty">No level roles yet. Award a role at a specific level below.</div>}
        {cfg.roles.map((r) => (
          <div key={`${r.level}`} className="row-item">
            <div><strong>Level {r.level}</strong> → <span className="muted">{meta.roleNames[r.role_id] || 'Unknown role'}</span></div>
            <div className="row-actions">
              <button className="btn btn-danger btn-sm" onClick={() => push('level', 'level/removeRole', { level: r.level })}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <div className="form-row" style={{ marginTop: 12 }}>
        <Field label="Level">
          <input type="number" min="1" value={newLevel} onChange={(e) => setNewLevel(e.target.value)} placeholder="e.g. 5" />
        </Field>
        <Field label="Role">
          <Select value={newRole} onChange={setNewRole} options={meta.roles} placeholder="Pick a role" />
        </Field>
      </div>
      <div className="save-bar">
        <button
          className="btn btn-primary"
          disabled={!newLevel || !newRole}
          onClick={() => {
            push('level', 'level/addRole', { level: Number(newLevel), role_id: newRole });
            setNewLevel('');
            setNewRole('');
          }}
        >
          Add level role
        </button>
      </div>

      <h3 style={{ marginTop: 32 }}>No-XP channels</h3>
      <div className="rows">
        {ignoredChannels.length === 0 && <div className="empty">Every channel earns XP.</div>}
        {ignoredChannels.map((id) => (
          <div key={id} className="row-item">
            <div>{meta.channelNames[id] || 'Unknown channel'}</div>
            <div className="row-actions">
              <button className="btn btn-danger btn-sm" onClick={() => { const next = ignoredChannels.filter((c) => c !== id); setIgnoredChannels(next); push('level', 'settings', { ignoredChannels: next }); }}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <div className="form-row" style={{ marginTop: 12 }}>
        <Field label="Channel">
          <Select value={newIgnoredChannel} onChange={setNewIgnoredChannel} options={meta.textChannels} placeholder="Pick a channel" />
        </Field>
      </div>
      <div className="save-bar">
        <button
          className="btn btn-primary"
          disabled={!newIgnoredChannel || ignoredChannels.includes(newIgnoredChannel)}
          onClick={() => {
            const next = [...ignoredChannels, newIgnoredChannel];
            setIgnoredChannels(next);
            push('level', 'settings', { ignoredChannels: next });
            setNewIgnoredChannel('');
          }}
        >
          Ignore channel
        </button>
      </div>

      <h3 style={{ marginTop: 32 }}>No-XP roles</h3>
      <div className="rows">
        {ignoredRoles.length === 0 && <div className="empty">Every role earns XP.</div>}
        {ignoredRoles.map((id) => (
          <div key={id} className="row-item">
            <div>{meta.roleNames[id] || 'Unknown role'}</div>
            <div className="row-actions">
              <button className="btn btn-danger btn-sm" onClick={() => { const next = ignoredRoles.filter((r) => r !== id); setIgnoredRoles(next); push('level', 'settings', { ignoredRoles: next }); }}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <div className="form-row" style={{ marginTop: 12 }}>
        <Field label="Role">
          <Select value={newIgnoredRole} onChange={setNewIgnoredRole} options={meta.roles} placeholder="Pick a role" />
        </Field>
      </div>
      <div className="save-bar">
        <button
          className="btn btn-primary"
          disabled={!newIgnoredRole || ignoredRoles.includes(newIgnoredRole)}
          onClick={() => {
            const next = [...ignoredRoles, newIgnoredRole];
            setIgnoredRoles(next);
            push('level', 'settings', { ignoredRoles: next });
            setNewIgnoredRole('');
          }}
        >
          Ignore role
        </button>
      </div>
    </div>
  );
}

/* ---------------- Greet ---------------- */
function GreetPanel({ cfg, meta, onRefresh, guildId }) {
  const { push, state } = usePusher(guildId, onRefresh);
  const [welcomeChannelId, setWelcomeChannelId] = useState(cfg.welcome_channel_id || '');
  const [welcomeMessage, setWelcomeMessage] = useState(cfg.welcome_message || '');
  const [autoRoleId, setAutoRoleId] = useState(cfg.auto_role_id || '');
  const [cardEnabled, setCardEnabled] = useState(cfg.card_enabled);
  const [goodbyeChannelId, setGoodbyeChannelId] = useState(cfg.goodbye_channel_id || '');
  const [goodbyeMessage, setGoodbyeMessage] = useState(cfg.goodbye_message || '');
  const [dmWelcome, setDmWelcome] = useState(cfg.dm_welcome ?? false);
  const [cardTheme, setCardTheme] = useState(cfg.card_theme || 'crimson');
  const [greetBots, setGreetBots] = useState(cfg.greet_bots ?? false);

  const save = () => push('greet', 'settings', {
    welcomeChannelId: welcomeChannelId || null,
    welcomeMessage,
    autoRoleId: autoRoleId || null,
    cardEnabled,
    goodbyeChannelId: goodbyeChannelId || null,
    goodbyeMessage,
    dmWelcome,
    cardTheme,
    greetBots,
  });

  return (
    <div>
      <PanelHeader botId="greet" />
      <div className="form-row">
        <Field label="Welcome channel">
          <Select value={welcomeChannelId} onChange={setWelcomeChannelId} options={meta.textChannels} placeholder="Not set" />
        </Field>
        <Field label="Auto role" hint="Role given to every new member.">
          <Select value={autoRoleId} onChange={setAutoRoleId} options={meta.roles} placeholder="No auto role" />
        </Field>
      </div>
      <Field label="Welcome message" hint="Placeholders: {user}, {server}, {membercount}">
        <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} />
      </Field>
      <div className="form-row">
        <Field label="Card theme">
          <Select
            value={cardTheme}
            onChange={setCardTheme}
            options={[
              { value: 'crimson', label: 'Crimson' },
              { value: 'gold', label: 'Gold' },
              { value: 'violet', label: 'Violet' },
              { value: 'ocean', label: 'Ocean' },
            ]}
            placeholder="Crimson"
          />
        </Field>
        <Field label="Goodbye channel" hint="Farewell posts go here. Empty = off.">
          <Select value={goodbyeChannelId} onChange={setGoodbyeChannelId} options={meta.textChannels} placeholder="Not set" />
        </Field>
      </div>
      <Field label="Goodbye message" hint="Placeholders: {user}, {server}, {membercount}">
        <textarea value={goodbyeMessage} onChange={(e) => setGoodbyeMessage(e.target.value)} />
      </Field>
      <Field>
        <Toggle checked={cardEnabled} onChange={setCardEnabled} label="Show the welcome card" />
      </Field>
      <Field hint="Sends the welcome text straight to the member's DMs too.">
        <Toggle checked={dmWelcome} onChange={setDmWelcome} label="DM welcome message" />
      </Field>
      <Field hint="Bots always get the auto-role; this also gives them messages and cards.">
        <Toggle checked={greetBots} onChange={setGreetBots} label="Greet bots too" />
      </Field>
      <SaveBar state={state} onSave={save} />
    </div>
  );
}

/* ---------------- Ticket ---------------- */
function TicketPanel({ cfg, meta, onRefresh, guildId }) {
  const { push, state } = usePusher(guildId, onRefresh);
  const [categoryChannelId, setCategoryChannelId] = useState(cfg.category_channel_id || '');
  const [logChannelId, setLogChannelId] = useState(cfg.log_channel_id || '');
  const [staffRoleId, setStaffRoleId] = useState(cfg.staff_role_id || '');
  const [maxTickets, setMaxTickets] = useState(cfg.max_tickets_per_user);
  const [bannerUrl, setBannerUrl] = useState(cfg.banner_url || '');
  const [inactiveCloseHours, setInactiveCloseHours] = useState(cfg.inactive_close_hours ?? 0);
  const [dmClose, setDmClose] = useState(cfg.dm_close ?? false);
  const [panelTitle, setPanelTitle] = useState(cfg.panel_title || '');
  const [panelRules, setPanelRules] = useState(cfg.panel_rules || '');
  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div>
      <PanelHeader botId="ticket" />
      <div className="form-row">
        <Field label="Category / parent channel" hint="Ticket channels are created inside this category.">
          <Select value={categoryChannelId} onChange={setCategoryChannelId} options={meta.categories} placeholder="Not set" />
        </Field>
        <Field label="Log channel" hint="Transcripts close into here.">
          <Select value={logChannelId} onChange={setLogChannelId} options={meta.textChannels} placeholder="Not set" />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Staff role">
          <Select value={staffRoleId} onChange={setStaffRoleId} options={meta.roles} placeholder="Not set" />
        </Field>
        <Field label="Max open tickets per user">
          <input type="number" min="1" value={maxTickets} onChange={(e) => setMaxTickets(Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Panel banner URL" hint="Image shown at the top of the ticket panel. Must start with http(s)://.">
        <input type="text" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://…" />
      </Field>
      <div className="form-row">
        <Field label="Panel title" hint="Empty = default title.">
          <input type="text" value={panelTitle} onChange={(e) => setPanelTitle(e.target.value)} placeholder="🎫 Dominyx Support Tickets" />
        </Field>
        <Field label="Auto-close after (hours idle)" hint="0 = never auto-close.">
          <input type="number" min="0" max="720" value={inactiveCloseHours} onChange={(e) => setInactiveCloseHours(e.target.value)} />
        </Field>
      </div>
      <Field label="Panel rules text" hint="Empty = default rules.">
        <textarea value={panelRules} onChange={(e) => setPanelRules(e.target.value)} />
      </Field>
      <Field hint="DMs the ticket creator when their ticket closes.">
        <Toggle checked={dmClose} onChange={setDmClose} label="DM on close" />
      </Field>
      <SaveBar
        state={state}
        onSave={() => push('ticket', 'settings', {
          categoryChannelId: categoryChannelId || null,
          logChannelId: logChannelId || null,
          staffRoleId: staffRoleId || null,
          maxTickets,
          bannerUrl: /^https?:\/\/.+/i.test(bannerUrl) ? bannerUrl : null,
          inactiveCloseHours: Math.min(720, Math.max(0, Number(inactiveCloseHours) || 0)),
          dmClose,
          panelTitle: panelTitle || null,
          panelRules: panelRules || null,
        })}
      />

      <h3 style={{ marginTop: 32 }}>Ticket categories</h3>
      <div className="rows">
        {cfg.categories.length === 0 && <div className="empty">No categories yet. Add some below so the panel menu has options.</div>}
        {cfg.categories.map((c, i) => (
          <div key={`${c.label}-${i}`} className="row-item">
            <div>{c.emoji ? `${c.emoji} ` : ''}<strong>{c.label}</strong>{c.description ? <span className="muted"> — {c.description}</span> : null}</div>
            <div className="row-actions">
              <button className="btn btn-danger btn-sm" onClick={() => push('ticket', 'ticket/removeCategory', { label: c.label })}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <div className="form-row" style={{ marginTop: 12 }}>
        <Field label="Label">
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="General support" />
        </Field>
        <Field label="Emoji (optional)">
          <input type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🎧" />
        </Field>
      </div>
      <Field label="Description (optional)">
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="save-bar">
        <button
          className="btn btn-primary"
          disabled={!label}
          onClick={() => {
            push('ticket', 'ticket/addCategory', { label, emoji: emoji || null, description: description || null });
            setLabel(''); setEmoji(''); setDescription('');
          }}
        >
          Add category
        </button>
      </div>
    </div>
  );
}

/* ---------------- Ping ---------------- */
function PingPanel({ cfg, meta, onRefresh, guildId }) {
  const { push, state } = usePusher(guildId, onRefresh);
  const [youtubeChannelId, setYoutubeChannelId] = useState(cfg.youtube_channel_id || '');
  const [alertChannelId, setAlertChannelId] = useState(cfg.live_alert_channel_id || '');
  const [enabled, setEnabled] = useState(cfg.enabled);
  const [alertMessage, setAlertMessage] = useState(cfg.alert_message || '');
  const [mentionRoleId, setMentionRoleId] = useState(cfg.mention_role_id || '');
  const [pollMinutes, setPollMinutes] = useState(cfg.poll_minutes ?? 10);

  return (
    <div>
      <PanelHeader botId="ping" />
      <div className="form-row">
        <Field label="YouTube channel ID" hint="Starts with UC… (find it in the channel's YouTube profile URL).">
          <input type="text" value={youtubeChannelId} onChange={(e) => setYoutubeChannelId(e.target.value)} placeholder="UCxxxxxxxxxxxx" />
        </Field>
        <Field label="Alert channel">
          <Select value={alertChannelId} onChange={setAlertChannelId} options={meta.textChannels} placeholder="Not set" />
        </Field>
      </div>
      <Field label="Custom alert message" hint="Placeholders: {channel}, {title}, {url}. Empty = default.">
        <textarea value={alertMessage} onChange={(e) => setAlertMessage(e.target.value)} placeholder="🔴 **{channel}** is live now! {url}" />
      </Field>
      <div className="form-row">
        <Field label="Mention role" hint="Pinged on every live alert.">
          <Select value={mentionRoleId} onChange={setMentionRoleId} options={meta.roles} placeholder="No mention" />
        </Field>
        <Field label="Check every (minutes)" hint="1–60.">
          <input type="number" min="1" max="60" value={pollMinutes} onChange={(e) => setPollMinutes(e.target.value)} />
        </Field>
      </div>
      <Field>
        <Toggle checked={enabled} onChange={setEnabled} label="Live alerts enabled" />
      </Field>
      <SaveBar
        state={state}
        onSave={() => push('ping', 'settings', {
          youtubeChannelId: youtubeChannelId || null,
          alertChannelId: alertChannelId || null,
          enabled,
          alertMessage: alertMessage || null,
          mentionRoleId: mentionRoleId || null,
          pollMinutes: Math.min(60, Math.max(1, Number(pollMinutes) || 10)),
        })}
      />
    </div>
  );
}

/* ---------------- Guard ---------------- */
function GuardPanel({ cfg, meta, onRefresh, guildId }) {
  const { push, state } = usePusher(guildId, onRefresh);
  const [modlogChannelId, setModlogChannelId] = useState(cfg.modlog_channel_id || '');
  const [category, setCategory] = useState('');
  const [roleId, setRoleId] = useState('');
  const [automodSpam, setAutomodSpam] = useState(cfg.automod_spam ?? false);
  const [spamThreshold, setSpamThreshold] = useState(cfg.spam_threshold ?? 5);
  const [spamSeconds, setSpamSeconds] = useState(cfg.spam_seconds ?? 10);
  const [automodLinks, setAutomodLinks] = useState(cfg.automod_links ?? false);
  const [automodCaps, setAutomodCaps] = useState(cfg.automod_caps ?? false);
  const [capsThreshold, setCapsThreshold] = useState(cfg.caps_threshold ?? 70);
  const [muteRoleId, setMuteRoleId] = useState(cfg.mute_role_id || '');
  const [warnsMute, setWarnsMute] = useState(cfg.warns_mute ?? 3);
  const [warnsBan, setWarnsBan] = useState(cfg.warns_ban ?? 5);

  const categories = cfg.self_role_categories || {};

  const saveAutomod = () => push('guard', 'settings', {
    modlogChannelId: modlogChannelId || null,
    automodSpam,
    spamThreshold: Math.max(2, Number(spamThreshold) || 5),
    spamSeconds: Math.min(120, Math.max(5, Number(spamSeconds) || 10)),
    automodLinks,
    automodCaps,
    capsThreshold: Math.min(100, Math.max(10, Number(capsThreshold) || 70)),
    muteRoleId: muteRoleId || null,
    warnsMute: Math.max(1, Number(warnsMute) || 3),
    warnsBan: Math.max(1, Number(warnsBan) || 5),
  });

  return (
    <div>
      <PanelHeader botId="guard" />
      <Field label="Mod-log channel" hint="Case records for bans, kicks and warns post here.">
        <Select value={modlogChannelId} onChange={setModlogChannelId} options={meta.textChannels} placeholder="Not set" />
      </Field>

      <h3 style={{ marginTop: 32 }}>Automod</h3>
      <Field hint="Delete + warn on spam bursts. Needs Message Content intent on the bot.">
        <Toggle checked={automodSpam} onChange={setAutomodSpam} label="Anti-spam" />
      </Field>
      <div className="form-row">
        <Field label="Spam messages" hint="Messages inside the window that trigger.">
          <input type="number" min="2" value={spamThreshold} onChange={(e) => setSpamThreshold(e.target.value)} />
        </Field>
        <Field label="Window (seconds)" hint="5–120.">
          <input type="number" min="5" max="120" value={spamSeconds} onChange={(e) => setSpamSeconds(e.target.value)} />
        </Field>
      </div>
      <Field hint="Delete messages containing links. Staff (Manage Messages) are exempt.">
        <Toggle checked={automodLinks} onChange={setAutomodLinks} label="Block links" />
      </Field>
      <Field hint="Delete messages that are mostly CAPS.">
        <Toggle checked={automodCaps} onChange={setAutomodCaps} label="Block caps" />
      </Field>
      <Field label="Caps threshold (%)" hint="10–100. Messages with 10+ letters only.">
        <input type="number" min="10" max="100" value={capsThreshold} onChange={(e) => setCapsThreshold(e.target.value)} />
      </Field>

      <h3 style={{ marginTop: 32 }}>Warn ladder</h3>
      <div className="form-row">
        <Field label="Mute role" hint="Given automatically at the mute threshold.">
          <Select value={muteRoleId} onChange={setMuteRoleId} options={meta.roles} placeholder="No mute role" />
        </Field>
        <Field label="Warns → mute" hint="0 disables this step.">
          <input type="number" min="0" value={warnsMute} onChange={(e) => setWarnsMute(e.target.value)} />
        </Field>
      </div>
      <Field label="Warns → ban" hint="0 disables this step.">
        <input type="number" min="0" value={warnsBan} onChange={(e) => setWarnsBan(e.target.value)} />
      </Field>
      <SaveBar state={state} onSave={saveAutomod} />

      <h3 style={{ marginTop: 32 }}>Self-assignable roles</h3>
      {Object.keys(categories).length === 0 && <div className="empty">No self-role categories yet.</div>}
      {Object.entries(categories).map(([cat, roleIds]) => (
        <div key={cat} style={{ marginBottom: 14 }}>
          <strong style={{ fontSize: 14 }}>{cat}</strong>
          <div className="rows" style={{ marginTop: 6 }}>
            {roleIds.map((id) => (
              <div key={id} className="row-item">
                <div>{meta.roleNames[id] || 'Unknown role'}</div>
                <div className="row-actions">
                  <button className="btn btn-danger btn-sm" onClick={() => push('guard', 'guard/removeSelfRole', { role_id: id })}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="form-row" style={{ marginTop: 12 }}>
        <Field label="Category">
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Games, Pronouns, Notifications…" />
        </Field>
        <Field label="Role">
          <Select value={roleId} onChange={setRoleId} options={meta.roles} placeholder="Pick a role" />
        </Field>
      </div>
      <div className="save-bar">
        <button
          className="btn btn-primary"
          disabled={!category || !roleId}
          onClick={() => {
            push('guard', 'guard/addSelfRole', { category, role_id: roleId });
            setCategory(''); setRoleId('');
          }}
        >
          Add to category
        </button>
      </div>
    </div>
  );
}