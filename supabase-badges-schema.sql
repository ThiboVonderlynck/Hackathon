-- Badges Database Schema

-- Table for badge definitions
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL, -- Emoji
  description TEXT NOT NULL,
  requirement TEXT NOT NULL, -- Human readable requirement
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for user earned badges (badges kunnen nooit verdwijnen)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id) -- Prevent duplicates
);

-- Table for tracking user game plays
CREATE TABLE IF NOT EXISTS user_game_plays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL, -- 'word-chain', 'meme-battle', 'art-duel', 'speed-quiz'
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, game_type) -- Track if user has played each game type
);

-- Table for tracking user reactions with emojis
CREATE TABLE IF NOT EXISTS user_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL, -- 'laugh', 'like', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking user streaks
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 1,
  last_activity_date DATE NOT NULL,
  UNIQUE(user_id)
);

-- Table for tracking completed challenges
CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_badges_user_idx ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS user_badges_badge_idx ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS user_game_plays_user_idx ON user_game_plays(user_id);
CREATE INDEX IF NOT EXISTS user_game_plays_type_idx ON user_game_plays(game_type);
CREATE INDEX IF NOT EXISTS user_reactions_user_idx ON user_reactions(user_id);
CREATE INDEX IF NOT EXISTS user_streaks_user_idx ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS user_challenges_user_idx ON user_challenges(user_id);

-- Enable Row Level Security
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badges
CREATE POLICY "Anyone can read badges"
  ON badges
  FOR SELECT
  USING (true);

-- RLS Policies for user_badges
CREATE POLICY "Users can read their own badges"
  ON user_badges
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read all badges (for leaderboard)"
  ON user_badges
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert badges (via service role)"
  ON user_badges
  FOR INSERT
  WITH CHECK (true); -- Will be restricted by application logic

-- RLS Policies for user_game_plays
CREATE POLICY "Users can read their own game plays"
  ON user_game_plays
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game plays"
  ON user_game_plays
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_reactions
CREATE POLICY "Users can read their own reactions"
  ON user_reactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reactions"
  ON user_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_streaks
CREATE POLICY "Users can read their own streaks"
  ON user_streaks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read all streaks"
  ON user_streaks
  FOR SELECT
  USING (true);

CREATE POLICY "Users can upsert their own streaks"
  ON user_streaks
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for user_challenges
CREATE POLICY "Users can read their own challenges"
  ON user_challenges
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges"
  ON user_challenges
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Insert badge definitions
INSERT INTO badges (id, name, icon, description, requirement) VALUES
  ('rocket', 'Rocket', '🚀', 'Welcome to NerdHub!', 'First time logging in'),
  ('gaming-console', 'Gaming Console', '🎮', 'Play all games at least once', 'Play all games at least one time'),
  ('joy-smile', 'Joy Smile', '😊', 'Spread the joy!', 'Get a laughing emoji on one of your reactions'),
  ('crown', 'Crown', '👑', 'Art master!', 'Win the drawing of the day at least one time'),
  ('fire', 'Fire', '🔥', 'On fire!', 'Get a streak of 3'),
  ('ninja', 'Ninja', '🥷', 'Challenge master', 'Complete at least 100 challenges')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  requirement = EXCLUDED.requirement;

-- Function to check and award rocket badge (first login)
CREATE OR REPLACE FUNCTION check_rocket_badge(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if user already has the badge
  IF NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = user_uuid AND badge_id = 'rocket') THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (user_uuid, 'rocket')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award gaming console badge
CREATE OR REPLACE FUNCTION check_gaming_console_badge(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if user already has the badge
  IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = user_uuid AND badge_id = 'gaming-console') THEN
    RETURN;
  END IF;

  -- Check if user has played all 4 games
  IF (
    SELECT COUNT(DISTINCT game_type) FROM user_game_plays
    WHERE user_id = user_uuid
    AND game_type IN ('word-chain', 'meme-battle', 'art-duel', 'speed-quiz')
  ) >= 4 THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (user_uuid, 'gaming-console')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award joy smile badge
CREATE OR REPLACE FUNCTION check_joy_smile_badge(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if user already has the badge
  IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = user_uuid AND badge_id = 'joy-smile') THEN
    RETURN;
  END IF;

  -- Check if user has a laughing reaction
  IF EXISTS (SELECT 1 FROM user_reactions WHERE user_id = user_uuid AND reaction_type = 'laugh') THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (user_uuid, 'joy-smile')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award crown badge
CREATE OR REPLACE FUNCTION check_crown_badge(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if user already has the badge
  IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = user_uuid AND badge_id = 'crown') THEN
    RETURN;
  END IF;

  -- Check if user has won drawing of the day (most votes on a drawing)
  -- This will be checked when voting ends
  -- For now, we'll check if user has a drawing with the most votes for any day
  IF EXISTS (
    SELECT 1 FROM art_duel_drawings ad
    WHERE ad.user_id = user_uuid
    AND EXISTS (
      SELECT 1 FROM art_duel_votes adv
      WHERE adv.drawing_id = ad.id
      GROUP BY adv.drawing_id
      HAVING COUNT(*) = (
        SELECT MAX(vote_count) FROM (
          SELECT COUNT(*) as vote_count
          FROM art_duel_votes
          WHERE drawing_id IN (
            SELECT id FROM art_duel_drawings
            WHERE DATE(created_at) = DATE(ad.created_at)
          )
          GROUP BY drawing_id
        ) subq
      )
    )
  ) THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (user_uuid, 'crown')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award fire badge
CREATE OR REPLACE FUNCTION check_fire_badge(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if user already has the badge
  IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = user_uuid AND badge_id = 'fire') THEN
    RETURN;
  END IF;

  -- Check if user has streak of 3 or more
  IF EXISTS (
    SELECT 1 FROM user_streaks
    WHERE user_id = user_uuid
    AND current_streak >= 3
  ) THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (user_uuid, 'fire')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award ninja badge
CREATE OR REPLACE FUNCTION check_ninja_badge(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if user already has the badge
  IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = user_uuid AND badge_id = 'ninja') THEN
    RETURN;
  END IF;

  -- Check if user has completed 100+ challenges
  IF (
    SELECT COUNT(*) FROM user_challenges
    WHERE user_id = user_uuid
  ) >= 100 THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (user_uuid, 'ninja')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

