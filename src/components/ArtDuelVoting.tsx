'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/contexts/UserContext';
import { ArrowLeft, Loader2, Trophy, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import MatrixRain from '@/components/MatrixRain';
import { checkCrownBadge } from '@/utils/badgeHelpers';

interface Drawing {
  id: string;
  canvas_data: string;
  user_id: string;
  building_id: string;
  username?: string;
  building_name?: string;
  vote_count: number;
  has_voted: boolean;
}

const ArtDuelVoting = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const { user, profile } = useAuth();
  const { connectedUsers } = useUsers();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState<string | null>(null);
  const [myBuildingId, setMyBuildingId] = useState<string | null>(null);
  const [dailyWord, setDailyWord] = useState<string | null>(null);

  useEffect(() => {
    const loadDrawings = async () => {
      if (!user || !sessionId) return;

      try {
        // Get user's building
        const myUser = connectedUsers.find(u => u.userId === user.id);
        if (!myUser) {
          setError('Please select a building first.');
          setLoading(false);
          return;
        }

        setMyBuildingId(myUser.buildingId);

        // Get today's word ID
        const today = new Date().toISOString().split('T')[0];
        const { data: wordData } = await supabase
          .from('daily_words')
          .select('id, word')
          .eq('date', today)
          .single();

        if (wordData) {
          setDailyWord(wordData.word);
        }

        // Get all drawings for today (excluding own building)
        const { data: drawingsData, error: drawingsError } = await supabase
          .from('art_duel_drawings')
          .select(`
            id,
            canvas_data,
            user_id,
            building_id,
            profiles:user_id (username)
          `)
          .neq('building_id', myUser.buildingId); // Exclude own building

        if (drawingsError) {
          setError('Failed to load drawings.');
          setLoading(false);
          return;
        }

        // Get vote counts and check if user has voted
        const drawingsWithVotes = await Promise.all(
          (drawingsData || []).map(async (drawing: any) => {
            // Get vote count
            const { count } = await supabase
              .from('art_duel_votes')
              .select('*', { count: 'exact', head: true })
              .eq('drawing_id', drawing.id);

            // Check if current user has voted
            const { data: userVote } = await supabase
              .from('art_duel_votes')
              .select('id')
              .eq('drawing_id', drawing.id)
              .eq('voter_id', user.id)
              .single();

            // Get building name
            const buildingName = drawing.building_id.replace('kortrijk-', '').replace('-', ' ').toUpperCase();

            return {
              id: drawing.id,
              canvas_data: drawing.canvas_data,
              user_id: drawing.user_id,
              building_id: drawing.building_id,
              username: drawing.profiles?.username || 'Anonymous',
              building_name: buildingName,
              vote_count: count || 0,
              has_voted: !!userVote,
            };
          })
        );

        setDrawings(drawingsWithVotes);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load drawings.');
        setLoading(false);
      }
    };

    loadDrawings();
  }, [user, sessionId, connectedUsers]);

  const handleVote = async (drawingId: string) => {
    if (!user || !myBuildingId || voting) return;

    setVoting(drawingId);

    try {
      // Get drawing to check building
      const drawing = drawings.find(d => d.id === drawingId);
      if (!drawing) return;

      // Check if user already voted on this drawing
      if (drawing.has_voted) {
        setVoting(null);
        return;
      }

      // Insert vote
      const { error: voteError } = await supabase
        .from('art_duel_votes')
        .insert({
          drawing_id: drawingId,
          voter_id: user.id,
          voter_building_id: myBuildingId,
        });

      if (voteError) {
        if (voteError.code === '23505') {
          // Already voted
          setVoting(null);
          return;
        }
        throw voteError;
      }

      // Update local state
      setDrawings(prev =>
        prev.map(d =>
          d.id === drawingId
            ? { ...d, vote_count: d.vote_count + 1, has_voted: true }
            : d
        )
      );

      setVoting(null);
    } catch (err: any) {
      console.error('Error voting:', err);
      setVoting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-mono">LOADING DRAWINGS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-destructive font-mono">{error}</p>
          <Button onClick={() => router.push('/')} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Sort by vote count
  const sortedDrawings = [...drawings].sort((a, b) => b.vote_count - a.vote_count);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <MatrixRain />

      <div className="relative z-10 pt-6 pb-10 px-4">
        <div className="container mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="space-y-1 flex-1">
              <h1 className="font-display text-xl text-primary">ART DUEL VOTING</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-[0.25em]">
                VOTE FOR THE BEST DRAWING
              </p>
            </div>
          </div>

          {/* Daily word */}
          {dailyWord && (
            <div className="text-center">
              <div className="inline-block px-6 py-3 bg-card border border-primary/30 rounded-lg">
                <p className="text-muted-foreground text-sm mb-1">WORD OF THE DAY:</p>
                <p className="text-foreground text-xl font-display font-bold">
                  "{dailyWord.toUpperCase()}"
                </p>
              </div>
            </div>
          )}

          {/* Drawings grid */}
          {drawings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-mono">
                No drawings available yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedDrawings.map((drawing, index) => (
                <motion.div
                  key={drawing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card border border-primary/30 rounded-lg overflow-hidden hover:border-primary/50 transition-all"
                >
                  {/* Drawing */}
                  <div className="relative aspect-square bg-muted">
                    <img
                      src={drawing.canvas_data}
                      alt={`Drawing by ${drawing.username}`}
                      className="w-full h-full object-contain"
                    />
                    {index === 0 && sortedDrawings.length > 1 && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        LEADING
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">By {drawing.username}</p>
                      <p className="text-xs text-muted-foreground/70">{drawing.building_name}</p>
                    </div>

                    {/* Vote count */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Heart className={`w-4 h-4 ${drawing.has_voted ? 'text-destructive fill-destructive' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-mono">{drawing.vote_count} votes</span>
                      </div>

                      {/* Vote button */}
                      <Button
                        size="sm"
                        variant={drawing.has_voted ? 'outline' : 'default'}
                        onClick={() => handleVote(drawing.id)}
                        disabled={drawing.has_voted || voting === drawing.id}
                        className="text-xs"
                      >
                        {drawing.has_voted ? 'Voted' : voting === drawing.id ? 'Voting...' : 'Vote'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="text-center text-sm text-muted-foreground">
            <p>You can vote on drawings from other buildings. Voting ends at the end of the day.</p>
          </div>
        </div>
      </div>

      {/* Scanlines overlay */}
      <div className="fixed inset-0 pointer-events-none scanlines opacity-30 z-50" />
    </div>
  );
};

export default ArtDuelVoting;

