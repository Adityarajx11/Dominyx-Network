import { redirect } from 'next/navigation';
import { getAuthedData } from '@/lib/auth';
import { SiteNav } from '@/components/SiteNav';
import GuildPicker from '@/components/GuildPicker';

export default async function DashboardPage() {
  const data = await getAuthedData();
  if (!data) redirect('/');

  return (
    <>
      <SiteNav user={data.user} />
      <div className="page-head">
        <GuildPicker guilds={data.manageable.map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          hasBot: data.botGuilds.has(g.id),
        }))} />
      </div>
    </>
  );
}

export const dynamic = 'force-dynamic';