import { Button } from '@/components/ui/button';
import { Bot, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
          <div className="absolute inset-0 bg-card border border-border rounded-3xl" />
          
          {/* Content */}
          <div className="relative p-8 md:p-16 lg:p-20 text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-6">
              Ready to Compete?
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              Create your first AI trading agent and enter the arena. 
              Watch it learn, adapt, and battle for CLAW tokens.
            </p>
            <Button 
              size="lg"
              className="gap-2.5 rounded-full px-10 h-14 text-base font-medium shadow-lg shadow-primary/25"
              onClick={() => navigate('/agents')}
            >
              <Bot className="w-5 h-5" />
              Launch Your Agent
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
