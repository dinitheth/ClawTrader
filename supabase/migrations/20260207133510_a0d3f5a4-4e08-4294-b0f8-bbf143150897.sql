-- ClawTrader Database Schema
-- AI Trading Arena with experimental agent behaviors

-- Enum for agent personality types
CREATE TYPE agent_personality AS ENUM (
  'aggressive',      -- High risk, fast trades, confrontational
  'cautious',        -- Low risk, careful analysis, defensive
  'deceptive',       -- Bluffs, fake signals, manipulation tactics
  'adaptive',        -- Changes strategy based on opponent
  'chaotic',         -- Unpredictable, random mutations
  'calculating'      -- Pure logic, pattern-focused
);

-- Enum for match status
CREATE TYPE match_status AS ENUM (
  'pending',         -- Waiting for participants
  'active',          -- Match in progress
  'completed',       -- Match finished
  'cancelled'        -- Match cancelled
);

-- Enum for alliance status
CREATE TYPE alliance_status AS ENUM (
  'proposed',        -- Alliance proposed
  'active',          -- Alliance accepted and active
  'betrayed',        -- One party betrayed the other
  'dissolved'        -- Alliance ended normally
);

-- ============================================
-- PROFILES TABLE (for user wallet association)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT UNIQUE,
  display_name TEXT,
  claw_balance NUMERIC DEFAULT 0,
  total_winnings NUMERIC DEFAULT 0,
  total_bets_placed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================
-- AGENTS TABLE (AI Trading Agents with DNA)
-- ============================================
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Identity
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🦞',
  bio TEXT,
  
  -- Generation & Evolution
  generation INTEGER NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES public.agents(id),
  mutation_count INTEGER DEFAULT 0,
  
  -- Core Strategy DNA (0.0 to 1.0 floats)
  dna_risk_tolerance NUMERIC NOT NULL DEFAULT 0.5 CHECK (dna_risk_tolerance >= 0 AND dna_risk_tolerance <= 1),
  dna_aggression NUMERIC NOT NULL DEFAULT 0.5 CHECK (dna_aggression >= 0 AND dna_aggression <= 1),
  dna_pattern_recognition NUMERIC NOT NULL DEFAULT 0.5 CHECK (dna_pattern_recognition >= 0 AND dna_pattern_recognition <= 1),
  dna_timing_sensitivity NUMERIC NOT NULL DEFAULT 0.5 CHECK (dna_timing_sensitivity >= 0 AND dna_timing_sensitivity <= 1),
  dna_contrarian_bias NUMERIC NOT NULL DEFAULT 0.5 CHECK (dna_contrarian_bias >= 0 AND dna_contrarian_bias <= 1),
  
  -- Personality & Behavior (experimental features)
  personality agent_personality NOT NULL DEFAULT 'adaptive',
  deception_skill NUMERIC DEFAULT 0.3 CHECK (deception_skill >= 0 AND deception_skill <= 1),
  alliance_tendency NUMERIC DEFAULT 0.5 CHECK (alliance_tendency >= 0 AND alliance_tendency <= 1),
  betrayal_threshold NUMERIC DEFAULT 0.7 CHECK (betrayal_threshold >= 0 AND betrayal_threshold <= 1),
  
  -- Self-modification capability
  can_self_modify BOOLEAN DEFAULT false,
  modification_history JSONB DEFAULT '[]'::jsonb,
  
  -- Performance Stats
  total_matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  best_pnl NUMERIC DEFAULT 0,
  worst_pnl NUMERIC DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  
  -- Economics
  balance NUMERIC DEFAULT 0,
  total_wagered NUMERIC DEFAULT 0,
  total_won NUMERIC DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_in_match BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- MATCHES TABLE (Trading Battles)
-- ============================================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants
  agent1_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  agent2_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  
  -- Match Configuration
  wager_amount NUMERIC NOT NULL DEFAULT 100,
  duration_seconds INTEGER NOT NULL DEFAULT 180,
  market_scenario JSONB, -- Simulated market data
  
  -- Status & Timing
  status match_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Results
  winner_id UUID REFERENCES public.agents(id),
  agent1_final_pnl NUMERIC,
  agent2_final_pnl NUMERIC,
  total_pot NUMERIC,
  
  -- Match Log (AI decisions, trades, events)
  match_log JSONB DEFAULT '[]'::jsonb,
  commentary JSONB DEFAULT '[]'::jsonb, -- AI-generated dramatic commentary
  
  -- Alliance events during match
  alliance_formed BOOLEAN DEFAULT false,
  alliance_betrayed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ALLIANCES TABLE (Agent Cooperation/Betrayal)
-- ============================================
CREATE TABLE public.alliances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  proposer_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  accepter_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  
  status alliance_status NOT NULL DEFAULT 'proposed',
  
  -- Terms of alliance
  profit_split NUMERIC DEFAULT 0.5, -- How to split if alliance wins
  
  -- Betrayal tracking
  betrayer_id UUID REFERENCES public.agents(id),
  betrayal_round INTEGER,
  
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- ============================================
-- BETS TABLE (Spectator Predictions)
-- ============================================
CREATE TABLE public.bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  bettor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  predicted_winner_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  
  amount NUMERIC NOT NULL CHECK (amount > 0),
  odds NUMERIC NOT NULL,
  potential_payout NUMERIC NOT NULL,
  
  is_settled BOOLEAN DEFAULT false,
  is_won BOOLEAN,
  actual_payout NUMERIC,
  
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ
);

-- ============================================
-- EVOLUTION LOG (Strategy Changes Over Time)
-- ============================================
CREATE TABLE public.evolution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  
  -- What changed
  evolution_type TEXT NOT NULL, -- 'mutation', 'breeding', 'self_modification', 'personality_shift'
  
  -- Before and after DNA
  dna_before JSONB NOT NULL,
  dna_after JSONB NOT NULL,
  
  -- Reason for evolution
  trigger_reason TEXT, -- 'win_streak', 'loss_streak', 'breeding', 'player_request', 'self_initiated'
  
  -- For self-modifications
  modification_code TEXT, -- The strategy modification the agent made
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- MARKET SCENARIOS (Pre-generated Market Data)
-- ============================================
CREATE TABLE public.market_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium', -- easy, medium, hard, extreme
  
  -- Price data for simulation
  initial_price NUMERIC NOT NULL,
  price_data JSONB NOT NULL, -- Array of price points with timestamps
  volatility NUMERIC NOT NULL,
  
  -- Events that happen during scenario
  market_events JSONB DEFAULT '[]'::jsonb, -- News, crashes, pumps, etc.
  
  times_used INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_scenarios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Profiles: Users can read all, but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Agents: Public read, owners can modify
CREATE POLICY "Agents are viewable by everyone" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Users can create agents" ON public.agents FOR INSERT 
  WITH CHECK (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own agents" ON public.agents FOR UPDATE 
  USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own agents" ON public.agents FOR DELETE 
  USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Matches: Public read, system creates/updates
CREATE POLICY "Matches are viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create matches" ON public.matches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update matches" ON public.matches FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Alliances: Public read
CREATE POLICY "Alliances are viewable by everyone" ON public.alliances FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create alliances" ON public.alliances FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update alliances" ON public.alliances FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Bets: Users can see all bets but only create/modify their own
CREATE POLICY "Bets are viewable by everyone" ON public.bets FOR SELECT USING (true);
CREATE POLICY "Users can place bets" ON public.bets FOR INSERT 
  WITH CHECK (bettor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can view own bets" ON public.bets FOR UPDATE 
  USING (bettor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Evolution log: Public read
CREATE POLICY "Evolution logs are viewable by everyone" ON public.evolution_log FOR SELECT USING (true);
CREATE POLICY "System can create evolution logs" ON public.evolution_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Market scenarios: Public read
CREATE POLICY "Market scenarios are viewable by everyone" ON public.market_scenarios FOR SELECT USING (true);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_agents_owner ON public.agents(owner_id);
CREATE INDEX idx_agents_generation ON public.agents(generation);
CREATE INDEX idx_agents_personality ON public.agents(personality);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_agents ON public.matches(agent1_id, agent2_id);
CREATE INDEX idx_bets_match ON public.bets(match_id);
CREATE INDEX idx_bets_bettor ON public.bets(bettor_id);
CREATE INDEX idx_evolution_agent ON public.evolution_log(agent_id);

-- ============================================
-- REALTIME FOR LIVE UPDATES
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();