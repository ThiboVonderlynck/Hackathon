-- Art Duel Database Schema

-- Table for daily words (word of the day)
CREATE TABLE IF NOT EXISTS daily_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default word for today (you can update this manually or via admin)
-- This ensures there's always a word available
INSERT INTO daily_words (word, date)
SELECT 'NERD', CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM daily_words WHERE date = CURRENT_DATE);

-- Table for Art Duel sessions (groups)
CREATE TABLE IF NOT EXISTS art_duel_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_word_id UUID NOT NULL REFERENCES daily_words(id) ON DELETE CASCADE,
  building_id TEXT NOT NULL, -- Campus/building ID
  participant_ids TEXT[] NOT NULL, -- Array of user IDs in this group
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(daily_word_id, building_id) -- One session per building per day
);

-- Table for Art Duel drawings
CREATE TABLE IF NOT EXISTS art_duel_drawings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES art_duel_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id TEXT NOT NULL, -- Campus/building where drawing was made
  canvas_data TEXT NOT NULL, -- Base64 encoded canvas image
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id) -- One drawing per user per session
);

-- Table for votes on drawings
CREATE TABLE IF NOT EXISTS art_duel_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drawing_id UUID NOT NULL REFERENCES art_duel_drawings(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voter_building_id TEXT NOT NULL, -- Building of voter
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(drawing_id, voter_id) -- One vote per user per drawing
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS daily_words_date_idx ON daily_words(date DESC);
CREATE INDEX IF NOT EXISTS art_duel_sessions_daily_word_idx ON art_duel_sessions(daily_word_id);
CREATE INDEX IF NOT EXISTS art_duel_sessions_building_idx ON art_duel_sessions(building_id);
CREATE INDEX IF NOT EXISTS art_duel_drawings_session_idx ON art_duel_drawings(session_id);
CREATE INDEX IF NOT EXISTS art_duel_drawings_user_idx ON art_duel_drawings(user_id);
CREATE INDEX IF NOT EXISTS art_duel_drawings_building_idx ON art_duel_drawings(building_id);
CREATE INDEX IF NOT EXISTS art_duel_votes_drawing_idx ON art_duel_votes(drawing_id);
CREATE INDEX IF NOT EXISTS art_duel_votes_voter_idx ON art_duel_votes(voter_id);

-- Enable Row Level Security
ALTER TABLE daily_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE art_duel_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE art_duel_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE art_duel_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_words
CREATE POLICY "Anyone can read daily words"
  ON daily_words
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert daily words"
  ON daily_words
  FOR INSERT
  WITH CHECK (false); -- Change to service role in production

-- RLS Policies for art_duel_sessions
CREATE POLICY "Anyone can read sessions"
  ON art_duel_sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create sessions"
  ON art_duel_sessions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own sessions"
  ON art_duel_sessions
  FOR UPDATE
  USING (auth.uid() = ANY(participant_ids));

-- RLS Policies for art_duel_drawings
CREATE POLICY "Anyone can read drawings"
  ON art_duel_drawings
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own drawings"
  ON art_duel_drawings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drawings"
  ON art_duel_drawings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for art_duel_votes
CREATE POLICY "Anyone can read votes"
  ON art_duel_votes
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON art_duel_votes
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() = voter_id AND
    -- Cannot vote on own drawing
    NOT EXISTS (
      SELECT 1 FROM art_duel_drawings 
      WHERE id = drawing_id AND user_id = auth.uid()
    ) AND
    -- Cannot vote on drawings from same building
    NOT EXISTS (
      SELECT 1 FROM art_duel_drawings 
      WHERE id = drawing_id AND building_id = voter_building_id
    )
  );

-- Function to get today's word
CREATE OR REPLACE FUNCTION get_today_word()
RETURNS TEXT AS $$
  SELECT word FROM daily_words WHERE date = CURRENT_DATE LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to check if voting period has ended (end of day)
CREATE OR REPLACE FUNCTION is_voting_period()
RETURNS BOOLEAN AS $$
  SELECT EXTRACT(HOUR FROM NOW()) >= 18; -- Voting starts at 6 PM
$$ LANGUAGE SQL STABLE;

-- Enable Realtime for drawings and votes
ALTER PUBLICATION supabase_realtime ADD TABLE art_duel_drawings;
ALTER PUBLICATION supabase_realtime ADD TABLE art_duel_votes;

