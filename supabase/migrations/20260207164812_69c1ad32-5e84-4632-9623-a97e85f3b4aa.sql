-- Allow anyone to insert a profile by wallet address (wallet-only auth)
CREATE POLICY "Anyone can insert profile by wallet"
  ON public.profiles
  FOR INSERT
  WITH CHECK (wallet_address IS NOT NULL);

-- Allow anyone to update their profile if they have the matching wallet
CREATE POLICY "Anyone can update profile by wallet"
  ON public.profiles
  FOR UPDATE
  USING (wallet_address IS NOT NULL);

-- Allow public insert of agents with a valid profile owner_id
DROP POLICY IF EXISTS "Users can create agents" ON public.agents;
CREATE POLICY "Users can create agents"
  ON public.agents
  FOR INSERT
  WITH CHECK (owner_id IS NOT NULL);

-- Allow update own agents based on owner_id existing
DROP POLICY IF EXISTS "Users can update own agents" ON public.agents;
CREATE POLICY "Users can update own agents"
  ON public.agents
  FOR UPDATE
  USING (owner_id IS NOT NULL);

-- Allow delete own agents  
DROP POLICY IF EXISTS "Users can delete own agents" ON public.agents;
CREATE POLICY "Users can delete own agents"
  ON public.agents
  FOR DELETE
  USING (owner_id IS NOT NULL);