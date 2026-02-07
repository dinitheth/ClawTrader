import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Agent = Database['public']['Tables']['agents']['Row'];
type AgentInsert = Database['public']['Tables']['agents']['Insert'];
type Match = Database['public']['Tables']['matches']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

// Agent CRUD operations
export const agentService = {
  async getAll(): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('total_won', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getByOwner(ownerId: string): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Agent | null> {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(agent: AgentInsert): Promise<Agent> {
    const { data, error } = await supabase
      .from('agents')
      .insert(agent)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<AgentInsert>): Promise<Agent> {
    const { data, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getLeaderboard(limit = 10): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('total_won', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  async getAvailableForMatch(): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('is_in_match', false)
      .eq('is_active', true)
      .gt('balance', 0);
    
    if (error) throw error;
    return data || [];
  },
};

// Match operations
export const matchService = {
  async getAll(): Promise<Match[]> {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getLive(): Promise<Match[]> {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        agent1:agents!matches_agent1_id_fkey(*),
        agent2:agents!matches_agent2_id_fkey(*)
      `)
      .eq('status', 'active')
      .order('started_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getPending(): Promise<Match[]> {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        agent1:agents!matches_agent1_id_fkey(*),
        agent2:agents!matches_agent2_id_fkey(*)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getRecent(limit = 10): Promise<Match[]> {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        agent1:agents!matches_agent1_id_fkey(*),
        agent2:agents!matches_agent2_id_fkey(*)
      `)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  async create(agent1Id: string, agent2Id: string, wagerAmount: number): Promise<Match> {
    const { data, error } = await supabase
      .from('matches')
      .insert({
        agent1_id: agent1Id,
        agent2_id: agent2Id,
        wager_amount: wagerAmount,
        total_pot: wagerAmount * 2,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async startSimulation(matchId: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('simulate-match', {
      body: { match_id: matchId },
    });
    
    if (error) throw error;
    return data;
  },

  subscribeToMatch(matchId: string, callback: (match: Match) => void) {
    return supabase
      .channel(`match-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => callback(payload.new as Match)
      )
      .subscribe();
  },

  subscribeToLiveMatches(callback: (match: Match) => void) {
    return supabase
      .channel('live-matches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        (payload) => callback(payload.new as Match)
      )
      .subscribe();
  },
};

// Profile operations
export const profileService = {
  async getOrCreate(userId: string, walletAddress?: string): Promise<Profile> {
    // First try to get existing profile
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existing) {
      // Update wallet if provided
      if (walletAddress && existing.wallet_address !== walletAddress) {
        const { data: updated, error } = await supabase
          .from('profiles')
          .update({ wallet_address: walletAddress })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return updated;
      }
      return existing;
    }

    // Create new profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        wallet_address: walletAddress,
        claw_balance: 1000, // Starting balance for demo
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getByWallet(walletAddress: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
};

// Betting operations
export const bettingService = {
  async placeBet(
    bettorId: string,
    matchId: string,
    predictedWinnerId: string,
    amount: number,
    odds: number
  ) {
    const { data, error } = await supabase
      .from('bets')
      .insert({
        bettor_id: bettorId,
        match_id: matchId,
        predicted_winner_id: predictedWinnerId,
        amount,
        odds,
        potential_payout: amount * odds,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getBetsForMatch(matchId: string) {
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('match_id', matchId);
    
    if (error) throw error;
    return data || [];
  },

  async getUserBets(profileId: string) {
    const { data, error } = await supabase
      .from('bets')
      .select(`
        *,
        match:matches(*, agent1:agents!matches_agent1_id_fkey(*), agent2:agents!matches_agent2_id_fkey(*))
      `)
      .eq('bettor_id', profileId)
      .order('placed_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
};
