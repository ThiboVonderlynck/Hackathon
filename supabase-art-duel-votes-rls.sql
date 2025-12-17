-- Art Duel Votes RLS Policy
-- Allows authenticated users to insert, delete, and read votes where voter_id matches their auth.uid()

-- Enable Row Level Security (if not already enabled)
ALTER TABLE art_duel_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can insert their own votes" ON art_duel_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON art_duel_votes;
DROP POLICY IF EXISTS "Users can read all votes" ON art_duel_votes;

-- Policy to allow users to insert votes where voter_id matches their auth.uid()
CREATE POLICY "Users can insert their own votes"
  ON art_duel_votes
  FOR INSERT
  WITH CHECK (auth.uid() = voter_id);

-- Policy to allow users to delete their own votes (for unvoting)
CREATE POLICY "Users can delete their own votes"
  ON art_duel_votes
  FOR DELETE
  USING (auth.uid() = voter_id);

-- Policy to allow users to read all votes (needed for vote counts)
CREATE POLICY "Users can read all votes"
  ON art_duel_votes
  FOR SELECT
  USING (true);

