-- Word Chain Database Schema

-- Table for daily word chain codes
CREATE TABLE IF NOT EXISTS word_chain_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE, -- 32 character unique code
  word TEXT NOT NULL, -- The word for today
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date) -- One code per user per day
);

-- Table for word chain claims (when someone fills in your word)
CREATE TABLE IF NOT EXISTS word_chain_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID NOT NULL REFERENCES word_chain_codes(id) ON DELETE CASCADE,
  claimer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(code_id, claimer_id) -- Each person can only claim a word once
);

-- Indexes
CREATE INDEX IF NOT EXISTS word_chain_codes_user_date_idx ON word_chain_codes(user_id, date DESC);
CREATE INDEX IF NOT EXISTS word_chain_codes_code_idx ON word_chain_codes(code);
CREATE INDEX IF NOT EXISTS word_chain_codes_date_idx ON word_chain_codes(date);
CREATE INDEX IF NOT EXISTS word_chain_claims_code_idx ON word_chain_claims(code_id);
CREATE INDEX IF NOT EXISTS word_chain_claims_claimer_idx ON word_chain_claims(claimer_id);

-- Enable Row Level Security
ALTER TABLE word_chain_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_chain_claims ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read their own codes" ON word_chain_codes;
DROP POLICY IF EXISTS "Users can read all codes for today (to claim)" ON word_chain_codes;
DROP POLICY IF EXISTS "Users can insert their own codes" ON word_chain_codes;
DROP POLICY IF EXISTS "Users can update their own codes" ON word_chain_codes;
DROP POLICY IF EXISTS "Anyone can read claims" ON word_chain_claims;
DROP POLICY IF EXISTS "Users can insert their own claims" ON word_chain_claims;

-- RLS Policies for word_chain_codes
CREATE POLICY "Users can read their own codes"
  ON word_chain_codes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read all codes for today (to claim)"
  ON word_chain_codes
  FOR SELECT
  USING (date = CURRENT_DATE);

CREATE POLICY "Users can insert their own codes"
  ON word_chain_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own codes"
  ON word_chain_codes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for word_chain_claims
CREATE POLICY "Anyone can read claims"
  ON word_chain_claims
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own claims"
  ON word_chain_claims
  FOR INSERT
  WITH CHECK (auth.uid() = claimer_id);

-- Drop existing functions if they exist (for idempotency)
DROP FUNCTION IF EXISTS generate_word_chain_code();
DROP FUNCTION IF EXISTS get_or_create_word_chain_code(UUID, TEXT);
DROP FUNCTION IF EXISTS claim_word_chain_code(TEXT, UUID);
DROP FUNCTION IF EXISTS is_word_chain_code_claimed(TEXT);

-- Function to generate a unique 32-character code
CREATE OR REPLACE FUNCTION generate_word_chain_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  char_pos INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    char_pos := floor(random() * length(chars) + 1)::INTEGER;
    result := result || substr(chars, char_pos, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create today's code for a user
CREATE OR REPLACE FUNCTION get_or_create_word_chain_code(user_uuid UUID, user_word TEXT)
RETURNS TEXT AS $$
DECLARE
  existing_code TEXT;
  new_code TEXT;
BEGIN
  -- Check if user already has a code for today
  SELECT code INTO existing_code
  FROM word_chain_codes
  WHERE user_id = user_uuid AND date = CURRENT_DATE;
  
  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;
  
  -- Generate a unique code
  LOOP
    new_code := generate_word_chain_code();
    -- Check if code is unique
    IF NOT EXISTS (SELECT 1 FROM word_chain_codes WHERE code = new_code) THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Insert new code
  INSERT INTO word_chain_codes (user_id, code, word, date)
  VALUES (user_uuid, new_code, user_word, CURRENT_DATE)
  ON CONFLICT (user_id, date) DO UPDATE SET
    code = EXCLUDED.code,
    word = EXCLUDED.word;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim a word (returns true if successful, false if already claimed or invalid)
CREATE OR REPLACE FUNCTION claim_word_chain_code(code_to_claim TEXT, claimer_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  code_record_id UUID;
  code_owner_id UUID;
  code_word TEXT;
  code_date DATE;
  already_claimed BOOLEAN;
BEGIN
  -- Get code info with id
  SELECT id, user_id, word, date INTO code_record_id, code_owner_id, code_word, code_date
  FROM word_chain_codes
  WHERE code = code_to_claim AND date = CURRENT_DATE;
  
  -- Check if code exists and is for today
  IF code_record_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is trying to claim their own word
  IF code_owner_id = claimer_uuid THEN
    RETURN FALSE;
  END IF;
  
  -- Check if already claimed by this user
  SELECT EXISTS(
    SELECT 1 FROM word_chain_claims
    WHERE code_id = code_record_id
    AND claimer_id = claimer_uuid
  ) INTO already_claimed;
  
  IF already_claimed THEN
    RETURN FALSE;
  END IF;
  
  -- Check if word has already been claimed (can only be claimed once total)
  IF EXISTS(
    SELECT 1 FROM word_chain_claims
    WHERE code_id = code_record_id
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Insert claim
  INSERT INTO word_chain_claims (code_id, claimer_id)
  VALUES (code_record_id, claimer_uuid);
  
  -- Give XP to both users (10 XP each)
  PERFORM add_xp(code_owner_id, 10, 'word-chain-claimed');
  PERFORM add_xp(claimer_uuid, 10, 'word-chain-claim');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a code has been claimed
CREATE OR REPLACE FUNCTION is_word_chain_code_claimed(code_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM word_chain_claims wcc
    JOIN word_chain_codes wc ON wcc.code_id = wc.id
    WHERE wc.code = code_to_check AND wc.date = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql STABLE;

