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

