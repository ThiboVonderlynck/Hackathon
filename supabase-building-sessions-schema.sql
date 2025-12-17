-- Building Sessions Schema
-- Tracks which building a user is in for each day (one per day, cannot be changed)

-- Table for user building sessions (one per user per day)
CREATE TABLE IF NOT EXISTS user_building_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id TEXT NOT NULL, -- Campus/building ID
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date) -- One building per user per day
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_building_sessions_user_date_idx ON user_building_sessions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS user_building_sessions_building_date_idx ON user_building_sessions(building_id, date DESC);

-- Enable Row Level Security
ALTER TABLE user_building_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read their own building sessions" ON user_building_sessions;
DROP POLICY IF EXISTS "Users can insert their own building session" ON user_building_sessions;
DROP POLICY IF EXISTS "Users can read all building sessions for today" ON user_building_sessions;

-- RLS Policies
CREATE POLICY "Users can read their own building sessions"
  ON user_building_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read all building sessions for today"
  ON user_building_sessions
  FOR SELECT
  USING (date = CURRENT_DATE);

CREATE POLICY "Users can insert their own building session"
  ON user_building_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to get or create today's building session
CREATE OR REPLACE FUNCTION get_or_create_building_session(user_uuid UUID, building_id_param TEXT)
RETURNS TEXT AS $$
DECLARE
  existing_building_id TEXT;
BEGIN
  -- Check if user already has a building session for today
  SELECT building_id INTO existing_building_id
  FROM user_building_sessions
  WHERE user_id = user_uuid AND date = CURRENT_DATE;
  
  -- If exists, return it (cannot change)
  IF existing_building_id IS NOT NULL THEN
    RETURN existing_building_id;
  END IF;
  
  -- Insert new building session
  INSERT INTO user_building_sessions (user_id, building_id, date)
  VALUES (user_uuid, building_id_param, CURRENT_DATE)
  ON CONFLICT (user_id, date) DO NOTHING;
  
  RETURN building_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's building for today
CREATE OR REPLACE FUNCTION get_user_building_today(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  building_id_result TEXT;
BEGIN
  SELECT building_id INTO building_id_result
  FROM user_building_sessions
  WHERE user_id = user_uuid AND date = CURRENT_DATE;
  
  RETURN building_id_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

