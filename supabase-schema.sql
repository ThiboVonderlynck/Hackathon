-- Create messages table for global chat
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  building_code TEXT NOT NULL,
  building_color TEXT NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on created_at for efficient ordering
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read messages
CREATE POLICY "Anyone can read messages"
  ON messages
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert messages (you might want to add authentication later)
CREATE POLICY "Anyone can insert messages"
  ON messages
  FOR INSERT
  WITH CHECK (true);

-- Optional: Policy to allow users to delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR DELETE
  USING (user_id = current_setting('app.user_id', true));

-- Create a function to get recent messages (optional, for pagination)
CREATE OR REPLACE FUNCTION get_recent_messages(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  username TEXT,
  building_code TEXT,
  building_color TEXT,
  message_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.user_id,
    m.username,
    m.building_code,
    m.building_color,
    m.message_text,
    m.created_at
  FROM messages m
  ORDER BY m.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Enable Realtime for the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Create online_users table for tracking users per building/room
CREATE TABLE IF NOT EXISTS online_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  building_id TEXT NOT NULL,
  location_verified BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on building_id for efficient queries
CREATE INDEX IF NOT EXISTS online_users_building_id_idx ON online_users(building_id);
CREATE INDEX IF NOT EXISTS online_users_last_seen_idx ON online_users(last_seen);

-- Enable Row Level Security (RLS)
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read online users
CREATE POLICY "Anyone can read online users"
  ON online_users
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert/update their own user record
CREATE POLICY "Anyone can insert online users"
  ON online_users
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update online users"
  ON online_users
  FOR UPDATE
  USING (true);

-- Policy: Anyone can delete online users (for cleanup)
CREATE POLICY "Anyone can delete online users"
  ON online_users
  FOR DELETE
  USING (true);

-- Create a function to cleanup old users (older than 2 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_users()
RETURNS void AS $$
BEGIN
  DELETE FROM online_users
  WHERE last_seen < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- Enable Realtime for the online_users table
ALTER PUBLICATION supabase_realtime ADD TABLE online_users;

-- Create profiles table for user profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read profiles
CREATE POLICY "Anyone can read profiles"
  ON profiles
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable Realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Anyone can view avatars
CREATE POLICY "Anyone can view avatars"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Storage policy: Authenticated users can upload avatars
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Storage policy: Users can update their own avatars
CREATE POLICY "Users can update their own avatars"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policy: Users can delete their own avatars
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

