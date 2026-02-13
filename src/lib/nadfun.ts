import { supabase } from "@/integrations/supabase/client";

// Nad.fun API endpoints
export const NAD_API = {
  TESTNET: 'https://dev-api.nad.fun',
  MAINNET: 'https://api.nadapp.net',
} as const;

// Nad.fun contract addresses — TESTNET (from https://nad.fun/skill.md)
export const NAD_CONTRACTS = {
  BONDING_CURVE_ROUTER: '0x865054F0F6A288adaAc30261731361EA7E908003',
  CURVE: '0x1228b0dc9481C11D3071E7A924B794CfB038994e',
  LENS: '0xB056d79CA5257589692699a46623F901a3BB76f1',
  DEX_ROUTER: '0x5D4a4f430cA3B1b2dB86B9cFE48a5316800F5fb2',
  DEX_FACTORY: '0xd0a37cf728CE2902eB8d4F6f2afc76854048253b',
  WMON: '0x5a4E0bFDeF88C9032CB4d24338C5EB3d3870BfDd',
  CREATOR_TREASURY: '0x24dFf9B68fA36f8400302e2babC3e049eA19459E',
} as const;

export interface TokenLaunchParams {
  agentId: string;
  tokenName: string;
  tokenSymbol: string;
  description: string;
  imageUrl?: string;
  revenueSharePercentage: number;
  governanceEnabled: boolean;
  accessTier: 'public' | 'premium' | 'vip' | 'founder';
  creatorWallet: string;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  marketCap: number;
  holders: number;
  price: number;
  metadataUri?: string;
  nadFunLink?: string;
  utilities: {
    governance: boolean;
    revenueShare: string;
    accessTier: string;
  };
}

// Launch a new token for an agent on nad.fun
export async function launchAgentToken(params: TokenLaunchParams) {
  const { data, error } = await supabase.functions.invoke('launch-agent-token', {
    body: {
      agent_id: params.agentId,
      token_name: params.tokenName,
      token_symbol: params.tokenSymbol,
      description: params.description,
      image_url: params.imageUrl,
      revenue_share_percentage: params.revenueSharePercentage,
      governance_enabled: params.governanceEnabled,
      access_tier: params.accessTier,
      creator_wallet: params.creatorWallet,
    },
  });

  if (error) throw error;
  return data;
}

// Get token info for an agent
export async function getAgentTokenInfo(agentId: string): Promise<TokenInfo | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('token_address, token_name, token_symbol, token_market_cap, token_holders, revenue_share_enabled, revenue_share_percentage, governance_enabled, access_tier')
    .eq('id', agentId)
    .single();

  if (error || !data?.token_address) return null;

  return {
    address: data.token_address,
    name: data.token_name || '',
    symbol: data.token_symbol || '',
    marketCap: data.token_market_cap || 0,
    holders: data.token_holders || 0,
    price: calculateTokenPrice(data.token_market_cap || 0, 10000000), // 10M total supply
    utilities: {
      governance: data.governance_enabled || false,
      revenueShare: data.revenue_share_enabled ? `${data.revenue_share_percentage}%` : 'disabled',
      accessTier: data.access_tier || 'public',
    },
  };
}

// Calculate token price from market cap (simple bonding curve)
function calculateTokenPrice(marketCap: number, totalSupply: number): number {
  return marketCap / totalSupply;
}

// Get token holders for an agent
export async function getTokenHolders(agentId: string) {
  const { data, error } = await supabase
    .from('agent_token_holders')
    .select('*')
    .eq('agent_id', agentId)
    .order('balance', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Check user's access level for an agent
export async function checkAccessLevel(agentId: string, walletAddress: string): Promise<{ level: string; features: string[] }> {
  const { data, error } = await supabase
    .from('access_grants')
    .select('*')
    .eq('agent_id', agentId)
    .eq('holder_address', walletAddress)
    .order('min_tokens_required', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // No access grant found - return public access
    return {
      level: 'public',
      features: ['view_stats'],
    };
  }

  // Safely parse features_unlocked
  const features = Array.isArray(data.features_unlocked)
    ? (data.features_unlocked as string[])
    : ['view_stats'];

  return {
    level: data.access_level,
    features,
  };
}

// Create a governance proposal
export async function createProposal(
  agentId: string,
  proposerAddress: string,
  title: string,
  description: string,
  proposalType: 'strategy' | 'dna' | 'alliance' | 'other',
  proposedChanges: Record<string, string | number | boolean>,
  votingDurationHours: number = 24
) {
  const votingEndsAt = new Date();
  votingEndsAt.setHours(votingEndsAt.getHours() + votingDurationHours);

  const { data, error } = await supabase
    .from('governance_proposals')
    .insert([{
      agent_id: agentId,
      proposer_address: proposerAddress,
      title,
      description,
      proposal_type: proposalType,
      proposed_changes: proposedChanges,
      voting_ends_at: votingEndsAt.toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Vote on a proposal
export async function voteOnProposal(
  proposalId: string,
  voterAddress: string,
  votePower: number,
  voteFor: boolean
) {
  // Insert vote
  const { error: voteError } = await supabase
    .from('governance_votes')
    .insert({
      proposal_id: proposalId,
      voter_address: voterAddress,
      vote_power: votePower,
      vote_direction: voteFor,
    });

  if (voteError) throw voteError;

  // Update proposal vote counts
  const { data: proposal, error: fetchError } = await supabase
    .from('governance_proposals')
    .select('votes_for, votes_against')
    .eq('id', proposalId)
    .single();

  if (fetchError) throw fetchError;

  const newVotesFor = (proposal.votes_for || 0) + (voteFor ? votePower : 0);
  const newVotesAgainst = (proposal.votes_against || 0) + (!voteFor ? votePower : 0);

  const { error: updateError } = await supabase
    .from('governance_proposals')
    .update({
      votes_for: newVotesFor,
      votes_against: newVotesAgainst,
    })
    .eq('id', proposalId);

  if (updateError) throw updateError;

  return { votesFor: newVotesFor, votesAgainst: newVotesAgainst };
}

// Get active proposals for an agent
export async function getActiveProposals(agentId: string) {
  const { data, error } = await supabase
    .from('governance_proposals')
    .select('*')
    .eq('agent_id', agentId)
    .eq('status', 'active')
    .gt('voting_ends_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get revenue distributions for an agent
export async function getRevenueDistributions(agentId: string) {
  const { data, error } = await supabase
    .from('revenue_distributions')
    .select('*')
    .eq('agent_id', agentId)
    .order('distributed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Subscribe to token holder updates
export function subscribeToTokenHolders(agentId: string, callback: (holders: any) => void) {
  return supabase
    .channel(`token-holders-${agentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'agent_token_holders',
        filter: `agent_id=eq.${agentId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

// Subscribe to governance proposal updates
export function subscribeToProposals(agentId: string, callback: (proposal: any) => void) {
  return supabase
    .channel(`proposals-${agentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'governance_proposals',
        filter: `agent_id=eq.${agentId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
}
