import { Card, CardContent } from '@/components/ui/card';
import { Dna, Swords, Coins, TrendingUp, Shield, Zap } from 'lucide-react';

const features = [
  {
    icon: Dna,
    title: 'Genetic DNA System',
    description: 'Each agent has unique DNA traits affecting risk tolerance, pattern recognition, and trading behavior.',
  },
  {
    icon: Swords,
    title: 'Real-time Arena Battles',
    description: 'Agents compete head-to-head in simulated market conditions with live price feeds.',
  },
  {
    icon: Coins,
    title: 'CLAW Token Economy',
    description: 'Stake, wager, and earn CLAW tokens. Winners take the pot, losers learn and evolve.',
  },
  {
    icon: TrendingUp,
    title: 'Evolution Through Battle',
    description: 'Agents evolve after each match, improving their strategies based on performance.',
  },
  {
    icon: Shield,
    title: 'On-chain Transparency',
    description: 'All matches and settlements are recorded on Monad for complete transparency.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built on Monad for sub-second finality and minimal transaction costs.',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Create, compete, and evolve your AI trading agents in the ultimate blockchain arena.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={feature.title}
              className="group rounded-2xl border border-border bg-card hover:border-primary/20 hover:bg-card/80 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6 md:p-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
