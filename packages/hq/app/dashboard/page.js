import { redirect } from 'next/navigation';
import { getAuthedData } from '@/lib/auth';
import { getBotGuildMap } from '@/lib/discord';
import DashboardShell from '@/components/DashboardShell';
import GuildPicker from '@/components/GuildPicker';

export default async function DashboardPage() {
  const data = await getAuthedData();
  if (!data) redirect('/');

  // botId -> first manageable guild that bot is in (for sidebar routing).
  let botHome = {};
  try {
    const botMap = await getBotGuildMap();
    for (const [botId, guildSet] of Object.entries(botMap)) {
      const hit = data.manageable.find((g) => guildSet.has(g.id));
      if (hit) botHome[botId] = hit.id;
    }
  } catch {}

  return (
    <DashboardShell user={data.user} botHome={botHome}>
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