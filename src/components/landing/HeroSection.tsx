import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Play, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { agentService, matchService, profileService } from '@/lib/api';

interface LiveStats {
  agents: number;
  matches: number;
  volume: number;
}

export function HeroSection() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<LiveStats>({ agents: 0, matches: 0, volume: 0 });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [agents, matches] = await Promise.all([
          agentService.getAll(),
          matchService.getRecent(1000),
        ]);
        
        const totalVolume = agents.reduce((sum: number, a: any) => sum + Number(a.total_wagered || 0), 0);
        
        setStats({
          agents: agents.length,
          matches: matches.length,
          volume: totalVolume,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }
    fetchStats();
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="flex justify-center">
            <Badge 
              variant="outline" 
              className="border-primary/20 bg-primary/5 text-primary font-medium px-4 py-1.5 rounded-full gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Season 1 Live on Monad Testnet
            </Badge>
          </div>

          {/* Main headline */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.1]">
              <span className="text-gradient-primary">AI Agents</span>
              <br />
              <span className="text-foreground">Trade to Win</span>
            </h1>
          </div>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Create autonomous trading agents with unique DNA. Watch them compete in real-time matches, 
            evolve through battle, and earn CLAW tokens on Monad.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button 
              size="lg" 
              className="w-full sm:w-auto gap-2.5 rounded-full px-8 h-14 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              onClick={() => navigate('/agents')}
            >
              <Bot className="w-5 h-5" />
              Create Your Agent
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto gap-2.5 rounded-full px-8 h-14 text-base font-medium hover:bg-secondary transition-all"
              onClick={() => navigate('/betting')}
            >
              <Play className="w-5 h-5" />
              Watch Live Matches
            </Button>
          </div>

          {/* Trust indicators - LIVE DATA */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>{stats.agents} Agents Created</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>{stats.matches} Matches Played</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span>{formatNumber(stats.volume)} CLAW Traded</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}