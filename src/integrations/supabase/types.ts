export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_grants: {
        Row: {
          access_level: string
          agent_id: string
          expires_at: string | null
          features_unlocked: Json | null
          granted_at: string
          holder_address: string
          id: string
          min_tokens_required: number
        }
        Insert: {
          access_level?: string
          agent_id: string
          expires_at?: string | null
          features_unlocked?: Json | null
          granted_at?: string
          holder_address: string
          id?: string
          min_tokens_required?: number
        }
        Update: {
          access_level?: string
          agent_id?: string
          expires_at?: string | null
          features_unlocked?: Json | null
          granted_at?: string
          holder_address?: string
          id?: string
          min_tokens_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_token_holders: {
        Row: {
          agent_id: string
          balance: number
          first_bought_at: string
          holder_address: string
          id: string
          last_updated_at: string
          percentage_owned: number | null
        }
        Insert: {
          agent_id: string
          balance?: number
          first_bought_at?: string
          holder_address: string
          id?: string
          last_updated_at?: string
          percentage_owned?: number | null
        }
        Update: {
          agent_id?: string
          balance?: number
          first_bought_at?: string
          holder_address?: string
          id?: string
          last_updated_at?: string
          percentage_owned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_token_holders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          access_tier: string | null
          alliance_tendency: number | null
          avatar: string
          balance: number | null
          best_pnl: number | null
          betrayal_threshold: number | null
          bio: string | null
          can_self_modify: boolean | null
          created_at: string
          current_streak: number | null
          deception_skill: number | null
          dna_aggression: number
          dna_contrarian_bias: number
          dna_pattern_recognition: number
          dna_risk_tolerance: number
          dna_timing_sensitivity: number
          generation: number
          governance_enabled: boolean | null
          id: string
          is_active: boolean | null
          is_in_match: boolean | null
          losses: number | null
          modification_history: Json | null
          mutation_count: number | null
          name: string
          owner_id: string | null
          parent_id: string | null
          personality: Database["public"]["Enums"]["agent_personality"]
          revenue_share_enabled: boolean | null
          revenue_share_percentage: number | null
          token_address: string | null
          token_holders: number | null
          token_launched_at: string | null
          token_market_cap: number | null
          token_name: string | null
          token_symbol: string | null
          total_matches: number | null
          total_pnl: number | null
          total_wagered: number | null
          total_won: number | null
          updated_at: string
          win_streak: number | null
          wins: number | null
          worst_pnl: number | null
        }
        Insert: {
          access_tier?: string | null
          alliance_tendency?: number | null
          avatar?: string
          balance?: number | null
          best_pnl?: number | null
          betrayal_threshold?: number | null
          bio?: string | null
          can_self_modify?: boolean | null
          created_at?: string
          current_streak?: number | null
          deception_skill?: number | null
          dna_aggression?: number
          dna_contrarian_bias?: number
          dna_pattern_recognition?: number
          dna_risk_tolerance?: number
          dna_timing_sensitivity?: number
          generation?: number
          governance_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          is_in_match?: boolean | null
          losses?: number | null
          modification_history?: Json | null
          mutation_count?: number | null
          name: string
          owner_id?: string | null
          parent_id?: string | null
          personality?: Database["public"]["Enums"]["agent_personality"]
          revenue_share_enabled?: boolean | null
          revenue_share_percentage?: number | null
          token_address?: string | null
          token_holders?: number | null
          token_launched_at?: string | null
          token_market_cap?: number | null
          token_name?: string | null
          token_symbol?: string | null
          total_matches?: number | null
          total_pnl?: number | null
          total_wagered?: number | null
          total_won?: number | null
          updated_at?: string
          win_streak?: number | null
          wins?: number | null
          worst_pnl?: number | null
        }
        Update: {
          access_tier?: string | null
          alliance_tendency?: number | null
          avatar?: string
          balance?: number | null
          best_pnl?: number | null
          betrayal_threshold?: number | null
          bio?: string | null
          can_self_modify?: boolean | null
          created_at?: string
          current_streak?: number | null
          deception_skill?: number | null
          dna_aggression?: number
          dna_contrarian_bias?: number
          dna_pattern_recognition?: number
          dna_risk_tolerance?: number
          dna_timing_sensitivity?: number
          generation?: number
          governance_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          is_in_match?: boolean | null
          losses?: number | null
          modification_history?: Json | null
          mutation_count?: number | null
          name?: string
          owner_id?: string | null
          parent_id?: string | null
          personality?: Database["public"]["Enums"]["agent_personality"]
          revenue_share_enabled?: boolean | null
          revenue_share_percentage?: number | null
          token_address?: string | null
          token_holders?: number | null
          token_launched_at?: string | null
          token_market_cap?: number | null
          token_name?: string | null
          token_symbol?: string | null
          total_matches?: number | null
          total_pnl?: number | null
          total_wagered?: number | null
          total_won?: number | null
          updated_at?: string
          win_streak?: number | null
          wins?: number | null
          worst_pnl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      alliances: {
        Row: {
          accepter_id: string | null
          betrayal_round: number | null
          betrayer_id: string | null
          id: string
          match_id: string | null
          profit_split: number | null
          proposed_at: string
          proposer_id: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["alliance_status"]
        }
        Insert: {
          accepter_id?: string | null
          betrayal_round?: number | null
          betrayer_id?: string | null
          id?: string
          match_id?: string | null
          profit_split?: number | null
          proposed_at?: string
          proposer_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["alliance_status"]
        }
        Update: {
          accepter_id?: string | null
          betrayal_round?: number | null
          betrayer_id?: string | null
          id?: string
          match_id?: string | null
          profit_split?: number | null
          proposed_at?: string
          proposer_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["alliance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "alliances_accepter_id_fkey"
            columns: ["accepter_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliances_betrayer_id_fkey"
            columns: ["betrayer_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliances_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliances_proposer_id_fkey"
            columns: ["proposer_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      bets: {
        Row: {
          actual_payout: number | null
          amount: number
          bettor_id: string | null
          id: string
          is_settled: boolean | null
          is_won: boolean | null
          match_id: string | null
          odds: number
          placed_at: string
          potential_payout: number
          predicted_winner_id: string | null
          settled_at: string | null
        }
        Insert: {
          actual_payout?: number | null
          amount: number
          bettor_id?: string | null
          id?: string
          is_settled?: boolean | null
          is_won?: boolean | null
          match_id?: string | null
          odds: number
          placed_at?: string
          potential_payout: number
          predicted_winner_id?: string | null
          settled_at?: string | null
        }
        Update: {
          actual_payout?: number | null
          amount?: number
          bettor_id?: string | null
          id?: string
          is_settled?: boolean | null
          is_won?: boolean | null
          match_id?: string | null
          odds?: number
          placed_at?: string
          potential_payout?: number
          predicted_winner_id?: string | null
          settled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bets_bettor_id_fkey"
            columns: ["bettor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_predicted_winner_id_fkey"
            columns: ["predicted_winner_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_log: {
        Row: {
          agent_id: string | null
          created_at: string
          dna_after: Json
          dna_before: Json
          evolution_type: string
          id: string
          match_id: string | null
          modification_code: string | null
          trigger_reason: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          dna_after: Json
          dna_before: Json
          evolution_type: string
          id?: string
          match_id?: string | null
          modification_code?: string | null
          trigger_reason?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          dna_after?: Json
          dna_before?: Json
          evolution_type?: string
          id?: string
          match_id?: string | null
          modification_code?: string | null
          trigger_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evolution_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_log_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_proposals: {
        Row: {
          agent_id: string
          created_at: string
          description: string
          executed_at: string | null
          id: string
          proposal_type: string
          proposed_changes: Json | null
          proposer_address: string
          quorum_required: number | null
          status: string
          title: string
          votes_against: number | null
          votes_for: number | null
          voting_ends_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          description: string
          executed_at?: string | null
          id?: string
          proposal_type?: string
          proposed_changes?: Json | null
          proposer_address: string
          quorum_required?: number | null
          status?: string
          title: string
          votes_against?: number | null
          votes_for?: number | null
          voting_ends_at: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          description?: string
          executed_at?: string | null
          id?: string
          proposal_type?: string
          proposed_changes?: Json | null
          proposer_address?: string
          quorum_required?: number | null
          status?: string
          title?: string
          votes_against?: number | null
          votes_for?: number | null
          voting_ends_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_proposals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_votes: {
        Row: {
          id: string
          proposal_id: string
          vote_direction: boolean
          vote_power: number
          voted_at: string
          voter_address: string
        }
        Insert: {
          id?: string
          proposal_id: string
          vote_direction: boolean
          vote_power: number
          voted_at?: string
          voter_address: string
        }
        Update: {
          id?: string
          proposal_id?: string
          vote_direction?: boolean
          vote_power?: number
          voted_at?: string
          voter_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "governance_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      market_scenarios: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          initial_price: number
          market_events: Json | null
          name: string
          price_data: Json
          times_used: number | null
          volatility: number
        }
        Insert: {
          created_at?: string
          difficulty?: string
          id?: string
          initial_price: number
          market_events?: Json | null
          name: string
          price_data: Json
          times_used?: number | null
          volatility: number
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          initial_price?: number
          market_events?: Json | null
          name?: string
          price_data?: Json
          times_used?: number | null
          volatility?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          agent1_final_pnl: number | null
          agent1_id: string | null
          agent2_final_pnl: number | null
          agent2_id: string | null
          alliance_betrayed: boolean | null
          alliance_formed: boolean | null
          commentary: Json | null
          created_at: string
          duration_seconds: number
          ended_at: string | null
          id: string
          market_scenario: Json | null
          match_log: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          total_pot: number | null
          updated_at: string
          wager_amount: number
          winner_id: string | null
        }
        Insert: {
          agent1_final_pnl?: number | null
          agent1_id?: string | null
          agent2_final_pnl?: number | null
          agent2_id?: string | null
          alliance_betrayed?: boolean | null
          alliance_formed?: boolean | null
          commentary?: Json | null
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          market_scenario?: Json | null
          match_log?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          total_pot?: number | null
          updated_at?: string
          wager_amount?: number
          winner_id?: string | null
        }
        Update: {
          agent1_final_pnl?: number | null
          agent1_id?: string | null
          agent2_final_pnl?: number | null
          agent2_id?: string | null
          alliance_betrayed?: boolean | null
          alliance_formed?: boolean | null
          commentary?: Json | null
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          market_scenario?: Json | null
          match_log?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          total_pot?: number | null
          updated_at?: string
          wager_amount?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_agent1_id_fkey"
            columns: ["agent1_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_agent2_id_fkey"
            columns: ["agent2_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          claw_balance: number | null
          created_at: string
          display_name: string | null
          id: string
          total_bets_placed: number | null
          total_winnings: number | null
          updated_at: string
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          claw_balance?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          total_bets_placed?: number | null
          total_winnings?: number | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          claw_balance?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          total_bets_placed?: number | null
          total_winnings?: number | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      revenue_distributions: {
        Row: {
          agent_id: string
          distributed_amount: number
          distributed_at: string
          distribution_tx_hash: string | null
          id: string
          match_id: string | null
          total_revenue: number
        }
        Insert: {
          agent_id: string
          distributed_amount: number
          distributed_at?: string
          distribution_tx_hash?: string | null
          id?: string
          match_id?: string | null
          total_revenue: number
        }
        Update: {
          agent_id?: string
          distributed_amount?: number
          distributed_at?: string
          distribution_tx_hash?: string | null
          id?: string
          match_id?: string | null
          total_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "revenue_distributions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_distributions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      agent_personality:
        | "aggressive"
        | "cautious"
        | "deceptive"
        | "adaptive"
        | "chaotic"
        | "calculating"
      alliance_status: "proposed" | "active" | "betrayed" | "dissolved"
      match_status: "pending" | "active" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_personality: [
        "aggressive",
        "cautious",
        "deceptive",
        "adaptive",
        "chaotic",
        "calculating",
      ],
      alliance_status: ["proposed", "active", "betrayed", "dissolved"],
      match_status: ["pending", "active", "completed", "cancelled"],
    },
  },
} as const
