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
  const [submissionEnded, setSubmissionEnded] = useState(false);
  const [deadlineHour, setDeadlineHour] = useState<number>(20);

  useEffect(() => {
    const loadDrawings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

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
          .select('id, word, date, submission_deadline_hour')
          .eq('date', today)
          .single();

        if (wordData) {
          setDailyWord(wordData.word);
        }

        // Check if submission period has ended using configurable deadline hour (default 20:00 / 8 PM)
        let submissionPeriodEnded = false;
        if (wordData) {
          const hour = wordData.submission_deadline_hour ?? 20; // Default to 8 PM
          setDeadlineHour(hour);
          const wordDate = new Date(wordData.date);
          const submissionDeadline = new Date(wordDate);
          submissionDeadline.setHours(hour, 0, 0, 0); // Set to configured hour (e.g., 20:00)
          submissionPeriodEnded = new Date() >= submissionDeadline;
        }
        setSubmissionEnded(submissionPeriodEnded);

        // Build query - if sessionId provided, filter by session, otherwise get all for today
        // Show ALL drawings (including own building) but only allow voting on other buildings
        let query = supabase
          .from('art_duel_drawings')
          .select(`
            id,
            canvas_data,
            user_id,
            building_id,
            is_completed
          `)
          // Don't exclude own building - show all drawings

        // If sessionId is provided, filter by that session
        if (sessionId) {
          query = query.eq('session_id', sessionId);
        } else {
          // Otherwise, get all drawings for today's word
          if (wordData) {
            // Get all sessions for today's word
            const { data: sessionsData } = await supabase
              .from('art_duel_sessions')
              .select('id')
              .eq('daily_word_id', wordData.id);

            if (sessionsData && sessionsData.length > 0) {
              const sessionIds = sessionsData.map(s => s.id);
              // Use .in() for multiple, .eq() for single
              if (sessionIds.length === 1) {
                query = query.eq('session_id', sessionIds[0]);
              } else {
                query = query.in('session_id', sessionIds);
              }
            } else {
              // No sessions yet, show empty state
              setDrawings([]);
              setLoading(false);
              return;
            }
          } else {
            // No word for today, show empty state
            setDrawings([]);
            setLoading(false);
            return;
          }
        }

        const { data: drawingsData, error: drawingsError } = await query;

        if (drawingsError) {
          console.error('Error loading drawings:', drawingsError);
          // Check if it's a query syntax error (400) - might be due to .in() with single value or missing column
          const isQueryError = drawingsError.code === '22P02' || 
                              drawingsError.code === '42703' || 
                              drawingsError.code === 'PGRST202' || 
                              drawingsError.message?.includes('is_completed') ||
                              drawingsError.message?.includes('syntax') ||
                              (drawingsError as any).status === 400;
          
          if (isQueryError) {
            // Retry without is_completed filter (column doesn't exist yet)
            let retryQuery = supabase
              .from('art_duel_drawings')
              .select(`
                id,
                canvas_data,
                user_id,
                building_id,
                is_completed
              `)
              // Show all drawings including own building

            if (sessionId) {
              retryQuery = retryQuery.eq('session_id', sessionId);
            } else if (wordData) {
              const { data: sessionsData } = await supabase
                .from('art_duel_sessions')
                .select('id')
                .eq('daily_word_id', wordData.id);

              if (sessionsData && sessionsData.length > 0) {
                const sessionIds = sessionsData.map(s => s.id);
                if (sessionIds.length === 1) {
                  retryQuery = retryQuery.eq('session_id', sessionIds[0]);
                } else {
                  retryQuery = retryQuery.in('session_id', sessionIds);
                }
              }
            }

            const { data: retryData, error: retryError } = await retryQuery;
            if (retryError) {
              setError('Failed to load drawings. Please run the database migration to add the is_completed column.');
              setLoading(false);
              return;
            }
            // Show all drawings if column doesn't exist (backward compatibility)
            processDrawings(retryData || []);
            return;
          } else {
            setError('Failed to load drawings.');
            setLoading(false);
            return;
          }
        }

        // Filter by is_completed - only show completed drawings
        // (Column might not exist in database yet)
        let filteredDrawings = drawingsData || [];
        if (drawingsData) {
          // Always show only completed drawings (both before and after deadline)
          filteredDrawings = drawingsData.filter((d: any) => {
            // If is_completed exists, use it; otherwise show all (backward compatibility)
            return d.is_completed === true;
          });
        }

        processDrawings(filteredDrawings);
      } catch (err: any) {
        setError(err.message || 'Failed to load drawings.');
        setLoading(false);
      }
    };

    const processDrawings = async (drawingsData: any[]) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get unique user IDs from drawings
        const userIds = [...new Set(drawingsData.map((d: any) => d.user_id))];
        
        // Fetch all profiles at once
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', userIds);

        // Create a map for quick lookup
        const profilesMap = new Map(
          (profilesData || []).map((p: any) => [p.user_id, p.username])
        );

        // Get vote counts and check if user has voted
        const drawingsWithVotes = await Promise.all(
          drawingsData.map(async (drawing: any) => {
            // Get vote count
            const { count, error: countError } = await supabase
              .from('art_duel_votes')
              .select('*', { count: 'exact', head: true })
              .eq('drawing_id', drawing.id);

            // Check if current user has voted (use maybeSingle to handle no vote case)
            const { data: userVote, error: voteError } = await supabase
              .from('art_duel_votes')
              .select('id')
              .eq('drawing_id', drawing.id)
              .eq('voter_id', user.id)
              .maybeSingle();
            
            // Log errors but don't fail the whole process
            if (voteError && voteError.code !== 'PGRST116') {
              console.warn('Error checking vote status:', voteError);
            }

            // Get building name
            const buildingName = drawing.building_id.replace('kortrijk-', '').replace('-', ' ').toUpperCase();

            return {
              id: drawing.id,
              canvas_data: drawing.canvas_data,
              user_id: drawing.user_id,
              building_id: drawing.building_id,
              username: profilesMap.get(drawing.user_id) || 'Anonymous',
              building_name: buildingName,
              vote_count: count || 0,
              has_voted: !!userVote,
            };
          })
        );

        setDrawings(drawingsWithVotes);
        setLoading(false);
      } catch (err: any) {
        console.error('Error processing drawings:', err);
        setError(err.message || 'Failed to load drawings.');
        setLoading(false);
      }
    };

    loadDrawings();
  }, [user, sessionId, connectedUsers]);

  const handleVote = async (drawingId: string) => {
    if (!user || !myBuildingId || voting) {
      console.log('Vote blocked:', { user: !!user, myBuildingId, voting, submissionEnded });
      return;
    }
    
    // Allow voting even before deadline if user wants to vote early
    // if (!submissionEnded) {
    //   console.log('Voting not yet enabled - deadline has not passed');
    //   return;
    // }

    setVoting(drawingId);

    try {
      // Get drawing to check building
      const drawing = drawings.find(d => d.id === drawingId);
      if (!drawing) return;

      // Check if user already voted on this drawing
      if (drawing.has_voted) {
        console.log('Already voted on this drawing');
        setVoting(null);
        return;
      }

      console.log('Inserting vote:', { drawingId, voterId: user.id, voterBuildingId: myBuildingId });

      // Insert vote
      const { data: voteData, error: voteError } = await supabase
        .from('art_duel_votes')
        .insert({
          drawing_id: drawingId,
          voter_id: user.id,
          voter_building_id: myBuildingId,
        })
        .select();

      if (voteError) {
        console.error('Vote error:', voteError);
        if (voteError.code === '23505') {
          // Already voted (unique constraint violation)
          console.log('Already voted (unique constraint)');
          setVoting(null);
          // Update local state to reflect that user has voted
          setDrawings(prev =>
            prev.map(d =>
              d.id === drawingId
                ? { ...d, has_voted: true }
                : d
            )
          );
          return;
        }
        alert(`Failed to vote: ${voteError.message || 'Unknown error'}`);
        setVoting(null);
        return;
      }

      console.log('Vote inserted successfully:', voteData);

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
            <div className="text-center space-y-3">
              <div className="inline-block px-6 py-3 bg-card border border-primary/30 rounded-lg">
                <p className="text-muted-foreground text-sm mb-1">WORD OF THE DAY:</p>
                <p className="text-foreground text-xl font-display font-bold">
                  "{dailyWord.toUpperCase()}"
                </p>
              </div>
              {!submissionEnded && (
                <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg">
                  <p className="text-primary text-sm font-mono">
                    ⏳ Submission period active - Voting will begin after {deadlineHour}:00
                  </p>
                  <p className="text-muted-foreground text-xs font-mono mt-1">
                    You can view drawings but voting is disabled until the deadline
                  </p>
                </div>
              )}
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
                      <div 
                        className={`flex items-center gap-2 ${
                          drawing.building_id !== myBuildingId && !drawing.has_voted && !voting
                            ? 'cursor-pointer hover:opacity-80 transition-opacity' 
                            : 'cursor-default'
                        }`}
                        onClick={() => {
                          if (drawing.building_id !== myBuildingId && !drawing.has_voted && !voting) {
                            handleVote(drawing.id);
                          }
                        }}
                        title={drawing.building_id === myBuildingId 
                          ? 'Your Building' 
                          : drawing.has_voted 
                            ? 'You already voted' 
                            : 'Click to vote'}
                      >
                        <Heart className={`w-4 h-4 ${drawing.has_voted ? 'text-destructive fill-destructive' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-mono">{drawing.vote_count} votes</span>
                      </div>

                      {/* Vote button - only show for other buildings */}
                      {drawing.building_id !== myBuildingId && (
                        <Button
                          size="sm"
                          variant={drawing.has_voted ? 'outline' : 'default'}
                          onClick={() => handleVote(drawing.id)}
                          disabled={drawing.has_voted || voting === drawing.id}
                          className="text-xs"
                        >
                          {drawing.has_voted ? 'Voted' : voting === drawing.id ? 'Voting...' : 'Vote'}
                        </Button>
                      )}
                      {drawing.building_id === myBuildingId && (
                        <span className="text-xs text-muted-foreground font-mono">Your Building</span>
                      )}
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

