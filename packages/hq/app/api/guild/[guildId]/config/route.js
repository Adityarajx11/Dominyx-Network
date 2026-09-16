import { NextResponse } from 'next/server';
import { requireGuildAccess } from '@/lib/auth';
import { readConfigs, applyPatch } from '@/lib/configStore';
import { getGuild, getGuildChannels, getGuildRoles, getGuildBotToken } from '@/lib/discord';

export async function GET(request, { params }) {
  try {
    const guildId = params.guildId;
    await requireGuildAccess(guildId);
    const botToken = await getGuildBotToken(guildId);

    const [guild, channels, roles, configs] = await Promise.all([
      getGuild(guildId, botToken),
      getGuildChannels(guildId, botToken),
      getGuildRoles(guildId, botToken),
      readConfigs(guildId),
    ]);

    return NextResponse.json({
      guild: { id: guild.id, name: guild.name, icon: guild.icon },
      channels: channels.map((c) => ({ id: c.id, name: c.name, type: c.type })),
      roles: roles.filter((r) => r.id !== guild.id).map((r) => ({ id: r.id, name: r.name, color: r.color })),
      configs,
    });
  } catch (err) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || 'Failed to load config' }, { status });
  }
}

export async function PATCH(request, { params }) {
  try {
    const guildId = params.guildId;
    await requireGuildAccess(guildId);

    const body = await request.json();
    const message = await applyPatch(guildId, body);
    const configs = await readConfigs(guildId);

    return NextResponse.json({ ok: true, message, configs });
  } catch (err) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message || 'Failed to save config' }, { status });
  }
}