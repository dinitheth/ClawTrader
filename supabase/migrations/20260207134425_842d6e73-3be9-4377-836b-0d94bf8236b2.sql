-- Add token-related fields to agents table
ALTER TABLE public.agents 
ADD COLUMN token_address TEXT,
ADD COLUMN token_symbol TEXT,
ADD COLUMN token_name TEXT,
ADD COLUMN token_launched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN token_market_cap NUMERIC DEFAULT 0,
ADD COLUMN token_holders INTEGER DEFAULT 0,
ADD COLUMN revenue_share_enabled BOOLEAN DEFAULT false,
ADD COLUMN revenue_share_percentage NUMERIC DEFAULT 10,
ADD COLUMN governance_enabled BOOLEAN DEFAULT false,
ADD COLUMN access_tier TEXT DEFAULT 'public';

-- Create token_holders table for tracking who holds agent tokens
CREATE TABLE public.agent_token_holders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  holder_address TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  percentage_owned NUMERIC DEFAULT 0,
  first_bought_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_id, holder_address)
);

-- Create governance_proposals table
CREATE TABLE public.governance_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  proposer_address TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  proposal_type TEXT NOT NULL DEFAULT 'strategy', -- strategy, dna, alliance, other
  proposed_changes JSONB,
  votes_for NUMERIC DEFAULT 0,
  votes_against NUMERIC DEFAULT 0,
  quorum_required NUMERIC DEFAULT 10, -- percentage of tokens needed
  status TEXT NOT NULL DEFAULT 'active', -- active, passed, rejected, executed
  voting_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Create governance_votes table
CREATE TABLE public.governance_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.governance_proposals(id) ON DELETE CASCADE,
  voter_address TEXT NOT NULL,
  vote_power NUMERIC NOT NULL,
  vote_direction BOOLEAN NOT NULL, -- true = for, false = against
  voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, voter_address)
);

-- Create revenue_distributions table
CREATE TABLE public.revenue_distributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id),
  total_revenue NUMERIC NOT NULL,
  distributed_amount NUMERIC NOT NULL,
  distribution_tx_hash TEXT,
  distributed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create access_grants table for premium features
CREATE TABLE public.access_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  holder_address TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'basic', -- basic, premium, vip, founder
  min_tokens_required NUMERIC NOT NULL DEFAULT 0,
  features_unlocked JSONB DEFAULT '[]'::jsonb,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(agent_id, holder_address)
);

-- Enable RLS on all new tables
ALTER TABLE public.agent_token_holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;

-- Token holders are viewable by everyone
CREATE POLICY "Token holders are viewable by everyone"
ON public.agent_token_holders FOR SELECT USING (true);

-- Governance proposals are viewable by everyone
CREATE POLICY "Governance proposals are viewable by everyone"
ON public.governance_proposals FOR SELECT USING (true);

-- Authenticated users can create proposals (must hold tokens - enforced in app)
CREATE POLICY "Authenticated users can create proposals"
ON public.governance_proposals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Governance votes are viewable by everyone
CREATE POLICY "Governance votes are viewable by everyone"
ON public.governance_votes FOR SELECT USING (true);

-- Authenticated users can vote
CREATE POLICY "Authenticated users can vote"
ON public.governance_votes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Revenue distributions are viewable by everyone
CREATE POLICY "Revenue distributions are viewable by everyone"
ON public.revenue_distributions FOR SELECT USING (true);

-- Access grants are viewable by everyone
CREATE POLICY "Access grants are viewable by everyone"
ON public.access_grants FOR SELECT USING (true);

-- Enable realtime for token-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_token_holders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.governance_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.governance_votes;