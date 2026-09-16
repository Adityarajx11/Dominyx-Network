import { NextResponse } from 'next/server';
import { getAuthedData } from '@/lib/auth';

export async function GET() {
  const data = await getAuthedData();
  if (!data) {
    return NextResponse.json({ user: null, guilds: [] }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      username: data.user.username,
      globalName: data.user.global_name || null,
      avatar: data.user.avatar,
    },
    guilds: data.manageable.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      hasBot: data.botGuilds.has(g.id),
    })),
  });
}