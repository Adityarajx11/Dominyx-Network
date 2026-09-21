import { redirect } from 'next/navigation';
import { getAuthedData } from '@/lib/auth';
import { getBotGuildMap } from '@/lib/discord';
import DashboardShell from '@/components/DashboardShell';
import GuildPicker from '@/components/GuildPicker';

export default async function DashboardPage() {
  const data = await getAuthedData();
  if (!data) redirect('/');

  // botId -> manageable guilds holding it (for sidebar routing).
  let botServers = {};
  try {
    const botMap = await getBotGuildMap();
    for (const [botId, guildSet] of Object.entries(botMap)) {
      const hits = data.manageable
        .filter((g) => guildSet.has(g.id))
        .map((g) => ({ id: g.id, name: g.name }));
      if (hits.length > 0) botServers[botId] = hits;
    }
  } catch {}

  return (
    <DashboardShell user={data.user} botServers={botServers}>
      <div className="page-head">
        <GuildPicker guilds={data.manageable.map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          hasBot: data.botGuilds.has(g.id),
        }))} />
      </div>
    </DashboardShell>
  );
}

export const dynamic = 'force-dynamic';