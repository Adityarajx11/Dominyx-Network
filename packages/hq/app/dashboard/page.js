import { redirect } from 'next/navigation';
import { getAuthedData } from '@/lib/auth';
import DashboardShell from '@/components/DashboardShell';
import GuildPicker from '@/components/GuildPicker';

export default async function DashboardPage() {
  const data = await getAuthedData();
  if (!data) redirect('/');

  // All manageable servers, for the sidebar per-bot picker.
  const servers = data.manageable.map((g) => ({ id: g.id, name: g.name }));

  return (
    <DashboardShell user={data.user} servers={servers}>
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