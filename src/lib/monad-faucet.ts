import { supabase } from "@/integrations/supabase/client";

export interface FaucetRequest {
  walletAddress: string;
  agentId?: string;
}

export interface FaucetResponse {
  success: boolean;
  txHash?: string;
  amount?: string;
  message?: string;
  error?: string;
}

/**
 * Request testnet MON tokens from the agent faucet
 * @param walletAddress Monad testnet wallet address
 * @param agentId Optional agent UUID to associate with the claim
 */
export async function requestTestnetMON(
  walletAddress: string,
  agentId?: string
): Promise<FaucetResponse> {
  if (!walletAddress || !walletAddress.startsWith("0x")) {
    throw new Error("Invalid wallet address");
  }

  try {
    const { data, error } = await supabase.functions.invoke("request-monad-faucet", {
      body: {
        wallet_address: walletAddress,
        agent_id: agentId,
      },
    });

    if (error) throw error;
    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to request tokens";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Check if a wallet has already claimed from the faucet recently
 */
export async function checkFaucetEligibility(
  walletAddress: string
): Promise<{ eligible: boolean; nextClaimTime?: Date }> {
  try {
    const { data, error } = await supabase.functions.invoke("check-faucet-eligibility", {
      body: {
        wallet_address: walletAddress,
      },
    });

    if (error) throw error;
    return data;
  } catch (err) {
    return { eligible: false };
  }
}
