import { useState, useEffect, useRef, useCallback } from 'react';
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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  pulseSpeed: number;
  pulsePhase: number;
}

export function HeroSection() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
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

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      // Reset transform before applying DPR scale to prevent accumulation
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles
    const w = () => canvas.width / (window.devicePixelRatio || 1);
    const h = () => canvas.height / (window.devicePixelRatio || 1);

    const PARTICLE_COUNT = 40;
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * w(),
      y: Math.random() * h(),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.1,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    let time = 0;

    const animate = () => {
      const cw = w();
      const ch = h();
      ctx.clearRect(0, 0, cw, ch);
      time += 0.01;

      // --- Layer 1: Subtle grid ---
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.03)';
      ctx.lineWidth = 0.5;
      const gridSize = 60;
      for (let x = 0; x < cw; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ch);
        ctx.stroke();
      }
      for (let y = 0; y < ch; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
        ctx.stroke();
      }

      // --- Layer 2: Trading wave (candlestick-style flowing line) ---
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.lineWidth = 1.5;
      const waveY = ch * 0.55;
      for (let x = 0; x < cw; x += 2) {
        const y = waveY
          + Math.sin(x * 0.008 + time * 0.8) * 30
          + Math.sin(x * 0.015 + time * 1.2) * 15
          + Math.sin(x * 0.003 + time * 0.3) * 50;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Second wave (faded)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.04)';
      for (let x = 0; x < cw; x += 2) {
        const y = waveY + 40
          + Math.sin(x * 0.006 + time * 0.5 + 1) * 25
          + Math.sin(x * 0.012 + time * 0.9 + 2) * 20;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // --- Layer 3: Particles + connections ---
      const particles = particlesRef.current;

      // Update particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulsePhase += p.pulseSpeed;

        // Wrap around
        if (p.x < -10) p.x = cw + 10;
        if (p.x > cw + 10) p.x = -10;
        if (p.y < -10) p.y = ch + 10;
        if (p.y > ch + 10) p.y = -10;
      }

      // Draw connections
      const CONNECTION_DIST = 120;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        const pulse = Math.sin(p.pulsePhase) * 0.3 + 0.7;
        const alpha = p.opacity * pulse;

        // Glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        gradient.addColorStop(0, `rgba(59, 130, 246, ${alpha * 0.6})`);
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `rgba(147, 197, 253, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Layer 4: Floating data points (small rising dots) ---
      for (let i = 0; i < 6; i++) {
        const x = (cw * (i + 0.5)) / 6;
        const yBase = ch * 0.7;
        const yOffset = ((time * 30 + i * 100) % (ch * 0.5));
        const y = yBase - yOffset;
        const fadeIn = Math.min(yOffset / 50, 1);
        const fadeOut = Math.max(1 - yOffset / (ch * 0.5), 0);
        const alpha = fadeIn * fadeOut * 0.3;

        ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x + Math.sin(time + i) * 10, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Animated canvas background */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0" style={{ zIndex: 1, pointerEvents: 'none' }}>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 relative" style={{ zIndex: 2 }}>
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/5 text-primary font-medium px-4 py-1.5 rounded-full gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Live on Monad Testnet
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