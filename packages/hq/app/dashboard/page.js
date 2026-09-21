import { redirect } from 'next/navigation';
import { getAuthedData } from '@/lib/auth';
import { BOTS } from '@/lib/bots';
import { getInviteUrl } from '@/lib/invite';
import DashboardShell from '@/components/DashboardShell';
import GuildPicker from '@/components/GuildPicker';

const BOT_IDS = new Set(BOTS.map((b) => b.id));

export default async function DashboardPage({ searchParams }) {
  const data = await getAuthedData();
  if (!data) redirect('/');

  const bot = BOT_IDS.has(searchParams?.bot) ? searchParams.bot : null;
  const botName = bot ? BOTS.find((b) => b.id === bot).name : null;
  const detectionOn = ['MUSIC', 'LEVEL', 'GREET', 'TICKET', 'PING', 'GUARD']
    .some((k) => !!process.env[`BOT_TOKEN_${k}`]);

  const inviteUrls = {};
  for (const b of BOTS) inviteUrls[b.id] = getInviteUrl(b.id);

  // When a bot is selected, presence means THAT bot is in the guild (not any bot).
  const guilds = data.manageable.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    hasBot: bot
      ? !!(data.botsMap?.[bot] && data.botsMap[bot].has(g.id))
      : data.botGuilds.has(g.id),
  }));

  return (
    <DashboardShell user={data.user}>
      <div className="page-head">
        <GuildPicker
          guilds={guilds}
          bot={bot}
          botName={botName}
          detectionOn={detectionOn}
          inviteUrls={inviteUrls}
        />
      </div>
    </DashboardShell>
  );
}

export const dynamic = 'force-dynamic';