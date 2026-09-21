'use client';

import { useEffect, useState, useCallback } from 'react';
import { BOTS } from '@/lib/bots';
import { Field, Toggle, Select, SaveBar } from './ui';

const TEXT_TYPES = [0, 5];
const CATEGORY_TYPE = 4;

export default function GuildConfig({ guildId, botsPresent = {}, inviteUrls = {}, initialBot = null }) {
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
function MusicPanel({ cfg, onRefresh, guildId }) {
  const { push, state } = usePusher(guildId, onRefresh);
  const [stay247, setStay247] = useState(cfg.stay247);

  return (
    <div>
      <PanelHeader botId="music" />
      <Field hint="Keeps the bot in your voice channel 24/7 and resumes playing the queue after downtime.">
        <Toggle checked={stay247} onChange={setStay247} label="Enable 24/7 mode" />
      </Field>
      <SaveBar state={state} onSave={() => push('music', 'settings', { stay247 })} />
    </div>
  );
}

/* ---------------- Level ---------------- */
function LevelPanel({ cfg, meta, onRefresh, guildId }) {
  const { push, state } = usePusher(guildId, onRefresh);
  const [channelId, setChannelId] = useState(cfg.channel_id || '');
  const [messageTemplate, setMessageTemplate] = useState(cfg.message_template || '');
  const [newLevel, setNewLevel] = useState('');
  const [newRole, setNewRole] = useState('');

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
      <SaveBar state={state} onSave={() => push('level', 'settings', { channelId: channelId || null, messageTemplate })} />

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
      <Field>
        <Toggle checked={cardEnabled} onChange={setCardEnabled} label="Show the crimson welcome card" />
      </Field>
      <SaveBar
        state={state}
        onSave={() => push('greet', 'settings', { welcomeChannelId: welcomeChannelId || null, welcomeMessage, autoRoleId: autoRoleId || null, cardEnabled })}
      />
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
      <Field label="Panel banner URL" hint="Image shown at the top of the ticket panel.">
        <input type="text" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://…" />
      </Field>
      <SaveBar
        state={state}
        onSave={() => push('ticket', 'settings', {
          categoryChannelId: categoryChannelId || null,
          logChannelId: logChannelId || null,
          staffRoleId: staffRoleId || null,
          maxTickets,
          bannerUrl: bannerUrl || null,
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
      <Field>
        <Toggle checked={enabled} onChange={setEnabled} label="Live alerts enabled" />
      </Field>
      <SaveBar
        state={state}
        onSave={() => push('ping', 'settings', { youtubeChannelId: youtubeChannelId || null, alertChannelId: alertChannelId || null, enabled })}
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

  const categories = cfg.self_role_categories || {};

  return (
    <div>
      <PanelHeader botId="guard" />
      <Field label="Mod-log channel" hint="Case records for bans, kicks and warns post here.">
        <Select value={modlogChannelId} onChange={setModlogChannelId} options={meta.textChannels} placeholder="Not set" />
      </Field>
      <SaveBar state={state} onSave={() => push('guard', 'settings', { modlogChannelId: modlogChannelId || null })} />

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