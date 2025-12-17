-- Profile Stats and Level System Schema

-- Add XP and stats columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_challenges INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- Function to calculate level from XP
-- Level formula: level = floor(sqrt(xp / 10)) + 1
-- This gives: 10xp=level1, 30xp=level2, 60xp=level3, 100xp=level4, etc.
CREATE OR REPLACE FUNCTION calculate_level(user_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF user_xp < 10 THEN
    RETURN 1;
  END IF;
  RETURN FLOOR(SQRT(user_xp / 10.0)) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get XP needed for next level
CREATE OR REPLACE FUNCTION xp_for_next_level(user_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  current_level INTEGER;
  next_level INTEGER;
  xp_for_next INTEGER;
BEGIN
  current_level := calculate_level(user_xp);
  next_level := current_level + 1;
  -- XP needed for next level: (next_level - 1)^2 * 10
  xp_for_next := (next_level - 1) * (next_level - 1) * 10;
  RETURN xp_for_next - user_xp;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to add XP to user profile
CREATE OR REPLACE FUNCTION add_xp(user_uuid UUID, xp_amount INTEGER, activity_type TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  new_xp INTEGER;
  new_level INTEGER;
  old_level INTEGER;
BEGIN
  -- Get current XP and level
  SELECT xp, calculate_level(xp) INTO old_level FROM profiles WHERE user_id = user_uuid;
  
  -- Add XP
  UPDATE profiles
  SET xp = xp + xp_amount,
      total_points = total_points + xp_amount,
      last_activity_date = CURRENT_DATE
  WHERE user_id = user_uuid;
  
  -- Get new XP and level
  SELECT xp, calculate_level(xp) INTO new_xp, new_level FROM profiles WHERE user_id = user_uuid;
  
  -- Check if level up occurred
  IF new_level > old_level THEN
    -- Level up! You could add a notification here
    RAISE NOTICE 'User % leveled up from % to %!', user_uuid, old_level, new_level;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update challenge count
CREATE OR REPLACE FUNCTION increment_challenge_count(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET total_challenges = total_challenges + 1,
      last_activity_date = CURRENT_DATE
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streak (called on login)
-- Streak is always at least 1 when logged in
-- If last login was yesterday, increment streak
-- If last login was before yesterday, reset to 1
CREATE OR REPLACE FUNCTION update_streak(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  current_streak_val INTEGER;
  last_activity DATE;
BEGIN
  SELECT current_streak, last_activity_date INTO current_streak_val, last_activity
  FROM profiles
  WHERE user_id = user_uuid;
  
  -- If never logged in before or last activity was before today
  IF last_activity IS NULL OR last_activity < CURRENT_DATE THEN
    -- Check if yesterday (continue streak) or older (reset to 1)
    IF last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
      -- Continue streak (yesterday was last login)
      UPDATE profiles
      SET current_streak = COALESCE(current_streak, 0) + 1,
          longest_streak = GREATEST(COALESCE(longest_streak, 0), COALESCE(current_streak, 0) + 1),
          last_activity_date = CURRENT_DATE
      WHERE user_id = user_uuid;
    ELSE
      -- Reset streak to 1 (missed a day or first login)
      UPDATE profiles
      SET current_streak = 1,
          longest_streak = GREATEST(COALESCE(longest_streak, 0), 1),
          last_activity_date = CURRENT_DATE
      WHERE user_id = user_uuid;
    END IF;
  ELSE
    -- Already logged in today, ensure streak is at least 1
    UPDATE profiles
    SET current_streak = GREATEST(COALESCE(current_streak, 0), 1)
    WHERE user_id = user_uuid AND (current_streak IS NULL OR current_streak < 1);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update streak when XP is added
CREATE OR REPLACE FUNCTION trigger_update_streak()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_streak(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: We'll call update_streak manually instead of using triggers
-- to have more control over when streaks are updated

-- XP rewards for different activities
-- These can be called from the application:
-- - Daily login: 10 XP
-- - Complete challenge: 25-100 XP (depending on challenge)
-- - Win challenge: 50-200 XP
-- - Vote on art: 5 XP
-- - Create drawing: 30 XP
-- - First login (rocket badge): 10 XP

