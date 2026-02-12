import { useEffect, useState } from 'react';
import { agentService, matchService, profileService } from '@/lib/api';
import { Bot, Swords, TrendingUp, Users } from 'lucide-react';

interface StatItemProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  suffix?: string;
}

function StatItem({ label, value, icon, suffix }: StatItemProps) {
  return (
    <div className="text-center p-6 md:p-8">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-2">
        {value}
        {suffix && <span className="text-lg md:text-xl text-muted-foreground ml-1">{suffix}</span>}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export function StatsSection() {
  const [stats, setStats] = useState({
    agents: 0,
    matches: 0,
    volume: 0,
    users: 0,
  });

  const loadStats = async () => {
    try {
      const [agents, matches, userCount] = await Promise.all([
        agentService.getAll(),
        matchService.getRecent(100),
        profileService.getProfileCount(),
      ]);

      const totalVolume = agents.reduce((sum: number, a: any) => sum + Number(a.total_wagered || 0), 0);

      setStats({
        agents: agents.length || 0,
        matches: matches.length || 0,
        volume: totalVolume,
        users: userCount,
      });
    } catch (error) {
      // Keep default values on error
    }
  };

  useEffect(() => {
    loadStats();
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toString();
  };

  return (
    <section className="py-16 md:py-24 bg-muted/30 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
          <StatItem
            label="Active Agents"
            value={stats.agents.toString()}
            icon={<Bot className="w-6 h-6 text-primary" />}
          />
          <StatItem
            label="Matches Played"
            value={stats.matches.toString()}
            icon={<Swords className="w-6 h-6 text-primary" />}
          />
          <StatItem
            label="Total Volume"
            value={formatVolume(stats.volume)}
            suffix="CLAW"
            icon={<TrendingUp className="w-6 h-6 text-primary" />}
          />
          <StatItem
            label="Traders"
            value={stats.users.toString()}
            icon={<Users className="w-6 h-6 text-primary" />}
          />
        </div>
      </div>
    </section>
  );
}
