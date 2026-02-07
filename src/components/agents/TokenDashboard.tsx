import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Coins, 
  Users, 
  Vote, 
  TrendingUp, 
  ExternalLink, 
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles
} from 'lucide-react';
import { 
  getAgentTokenInfo, 
  getTokenHolders, 
  getActiveProposals, 
  getRevenueDistributions,
  checkAccessLevel,
  subscribeToTokenHolders,
  subscribeToProposals,
  type TokenInfo 
} from '@/lib/nadfun';
import { useToast } from '@/hooks/use-toast';
import { monadTestnet } from '@/lib/wagmi';

interface TokenDashboardProps {
  agentId: string;
  agentName: string;
}

export function TokenDashboard({ agentId, agentName }: TokenDashboardProps) {
  const { address } = useAccount();
  const { toast } = useToast();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [holders, setHolders] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [userAccess, setUserAccess] = useState<{ level: string; features: string[] }>({ level: 'public', features: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [token, holdersList, proposalsList, distList] = await Promise.all([
          getAgentTokenInfo(agentId),
          getTokenHolders(agentId),
          getActiveProposals(agentId),
          getRevenueDistributions(agentId),
        ]);
        
        setTokenInfo(token);
        setHolders(holdersList);
        setProposals(proposalsList);
        setDistributions(distList);

        if (address && token) {
          const access = await checkAccessLevel(agentId, address);
          setUserAccess(access);
        }
      } catch (error) {
        console.error('Failed to load token data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Subscribe to realtime updates
    const holdersChannel = subscribeToTokenHolders(agentId, () => {
      getTokenHolders(agentId).then(setHolders);
    });
    const proposalsChannel = subscribeToProposals(agentId, () => {
      getActiveProposals(agentId).then(setProposals);
    });

    return () => {
      holdersChannel.unsubscribe();
      proposalsChannel.unsubscribe();
    };
  }, [agentId, address]);

  const copyAddress = () => {
    if (tokenInfo?.address) {
      navigator.clipboard.writeText(tokenInfo.address);
      toast({ title: 'Address copied!' });
    }
  };

  if (loading) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Loading token data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tokenInfo) {
    return null;
  }

  return (
    <Card className="glass border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            ${tokenInfo.symbol} Token
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/50">
              {userAccess.level.toUpperCase()}
            </Badge>
            <Button variant="ghost" size="sm" onClick={copyAddress}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a 
                href={`${monadTestnet.blockExplorers.default.url}/token/${tokenInfo.address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-background/30 border border-border">
            <div className="text-xs text-muted-foreground">Market Cap</div>
            <div className="text-lg font-bold text-primary">${tokenInfo.marketCap.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-background/30 border border-border">
            <div className="text-xs text-muted-foreground">Holders</div>
            <div className="text-lg font-bold flex items-center gap-1">
              <Users className="w-4 h-4 text-secondary" />
              {tokenInfo.holders}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-background/30 border border-border">
            <div className="text-xs text-muted-foreground">Price</div>
            <div className="text-lg font-bold flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-accent" />
              ${tokenInfo.price.toFixed(6)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-background/30 border border-border">
            <div className="text-xs text-muted-foreground">Rev Share</div>
            <div className="text-lg font-bold text-accent">{tokenInfo.utilities.revenueShare}</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="holders">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="holders">Holders</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          {/* Holders Tab */}
          <TabsContent value="holders" className="mt-4 space-y-3">
            {holders.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">No holders yet</div>
            ) : (
              holders.slice(0, 10).map((holder, i) => (
                <div 
                  key={holder.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-mono text-sm">
                        {holder.holder_address.slice(0, 6)}...{holder.holder_address.slice(-4)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {holder.balance.toLocaleString()} tokens
                      </div>
                    </div>
                  </div>
                  <Badge variant={holder.percentage_owned > 5 ? 'default' : 'outline'}>
                    {holder.percentage_owned.toFixed(2)}%
                  </Badge>
                </div>
              ))
            )}
          </TabsContent>

          {/* Governance Tab */}
          <TabsContent value="governance" className="mt-4 space-y-3">
            {!tokenInfo.utilities.governance ? (
              <div className="text-center text-muted-foreground py-4">
                Governance is disabled for this token
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-4">
                <Vote className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <div className="text-muted-foreground">No active proposals</div>
                {userAccess.features.includes('governance_voting') && (
                  <Button variant="outline" size="sm" className="mt-2">
                    Create Proposal
                  </Button>
                )}
              </div>
            ) : (
              proposals.map((proposal) => {
                const totalVotes = (proposal.votes_for || 0) + (proposal.votes_against || 0);
                const forPercentage = totalVotes > 0 ? (proposal.votes_for / totalVotes) * 100 : 50;
                const endDate = new Date(proposal.voting_ends_at);
                const isExpired = endDate < new Date();

                return (
                  <div
                    key={proposal.id}
                    className="p-4 rounded-lg bg-background/30 border border-border space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="outline" className="mb-1">
                          {proposal.proposal_type}
                        </Badge>
                        <div className="font-medium">{proposal.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {proposal.description}
                        </div>
                      </div>
                      {isExpired ? (
                        forPercentage > 50 ? (
                          <CheckCircle className="w-5 h-5 text-accent" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60))}h left
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-accent">For: {proposal.votes_for || 0}</span>
                        <span className="text-destructive">Against: {proposal.votes_against || 0}</span>
                      </div>
                      <Progress value={forPercentage} className="h-2" />
                    </div>

                    {!isExpired && userAccess.features.includes('governance_voting') && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1 text-accent border-accent/50">
                          Vote For
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-destructive border-destructive/50">
                          Vote Against
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="mt-4 space-y-3">
            {distributions.length === 0 ? (
              <div className="text-center py-4">
                <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <div className="text-muted-foreground">No revenue distributions yet</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Holders will receive {tokenInfo.utilities.revenueShare} of match winnings
                </div>
              </div>
            ) : (
              distributions.map((dist) => (
                <div
                  key={dist.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border"
                >
                  <div>
                    <div className="font-medium text-primary">
                      +${dist.distributed_amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      From match winnings
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      {new Date(dist.distributed_at).toLocaleDateString()}
                    </div>
                    {dist.distribution_tx_hash && (
                      <a
                        href={`${monadTestnet.blockExplorers.default.url}/tx/${dist.distribution_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View tx
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
