'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/contexts/UserContext';
import { ArrowLeft, Loader2 } from 'lucide-react';
import MatrixRain from '@/components/MatrixRain';
import { trackGamePlay, trackChallenge } from '@/utils/badgeHelpers';

interface DrawingData {
  participant_id: string;
  x: number;
  y: number;
  prevX: number | null;
  prevY: number | null;
  is_drawing: boolean;
}

interface DroppedPencil {
  id: number;
  x: number;
  y: number;
  rotation: number;
}

const ArtDuel = () => {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { connectedUsers } = useUsers();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeLeft, setTimeLeft] = useState(90);
  const [partnerCursor, setPartnerCursor] = useState<DrawingData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const partnerLastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [chaosLevel, setChaosLevel] = useState(0);
  const [droppedPencils, setDroppedPencils] = useState<DroppedPencil[]>([]);
  const pencilIdRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [dailyWord, setDailyWord] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerAvatar, setPartnerAvatar] = useState<string>('user');
  const [myBuildingId, setMyBuildingId] = useState<string | null>(null);
  const drawingCompleteRef = useRef(false);

  // Get today's word and create/find session
  useEffect(() => {
    const initializeGame = async () => {
      if (!user) return;

      try {
        // Get today's word
        const today = new Date().toISOString().split('T')[0];
        const { data: wordData, error: wordError } = await supabase
          .from('daily_words')
          .select('id, word')
          .eq('date', today)
          .single();

        if (wordError || !wordData) {
          setError('No word of the day found. Please try again later.');
          setLoading(false);
          return;
        }

        setDailyWord(wordData.word);

        // Get user's building from connected users
        const myUser = connectedUsers.find(u => u.userId === user.id);
        if (!myUser) {
          setError('Please select a building first.');
          setLoading(false);
          return;
        }

        setMyBuildingId(myUser.buildingId);

        // Find or create session for this building
        const { data: sessionData, error: sessionError } = await supabase
          .from('art_duel_sessions')
          .select('*')
          .eq('daily_word_id', wordData.id)
          .eq('building_id', myUser.buildingId)
          .single();

        let currentSessionId: string;

        if (sessionError || !sessionData) {
          // Create new session
          const { data: newSession, error: createError } = await supabase
            .from('art_duel_sessions')
            .insert({
              daily_word_id: wordData.id,
              building_id: myUser.buildingId,
              participant_ids: [user.id],
            })
            .select()
            .single();

          if (createError || !newSession) {
            setError('Failed to create session.');
            setLoading(false);
            return;
          }

          currentSessionId = newSession.id;
        } else {
          // Join existing session
          const participantIds = sessionData.participant_ids || [];
          if (!participantIds.includes(user.id)) {
            const { error: updateError } = await supabase
              .from('art_duel_sessions')
              .update({
                participant_ids: [...participantIds, user.id],
              })
              .eq('id', sessionData.id);

            if (updateError) {
              setError('Failed to join session.');
              setLoading(false);
              return;
            }
          }

          currentSessionId = sessionData.id;

          // Get partner avatar (first other participant)
          const partnerId = participantIds.find((id: string) => id !== user.id);
          if (partnerId) {
            const { data: partnerProfile } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('user_id', partnerId)
              .single();

            if (partnerProfile?.avatar_url) {
              setPartnerAvatar(partnerProfile.avatar_url);
            }
          }
        }

        setSessionId(currentSessionId);

        // Setup realtime channel
        const channel = supabase.channel(`canvas:${currentSessionId}`, {
          config: {
            broadcast: { self: false },
          },
        });

        channel
          .on('broadcast', { event: 'cursor_move' }, (payload) => {
            const data = payload.payload as DrawingData;
            if (data.participant_id !== user.id) {
              if (data.is_drawing && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                  if (data.prevX !== null && data.prevY !== null) {
                    ctx.beginPath();
                    ctx.moveTo(data.prevX, data.prevY);
                    ctx.lineTo(data.x, data.y);
                    ctx.strokeStyle = 'hsl(180, 100%, 50%)';
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.stroke();
                  } else {
                    ctx.beginPath();
                    ctx.arc(data.x, data.y, 1.5, 0, Math.PI * 2);
                    ctx.fillStyle = 'hsl(180, 100%, 50%)';
                    ctx.fill();
                  }
                }
              }
              setPartnerCursor(data);
              partnerLastPosRef.current = { x: data.x, y: data.y };
            }
          })
          .on('broadcast', { event: 'pencil_drop' }, (payload) => {
            const data = payload.payload as { participant_id: string; x: number; y: number };
            if (data.participant_id !== user.id) {
              const newPencil: DroppedPencil = {
                id: pencilIdRef.current++,
                x: data.x,
                y: data.y,
                rotation: Math.random() * 60 - 30,
              };
              setDroppedPencils((prev) => [...prev, newPencil]);
              setTimeout(() => {
                setDroppedPencils((prev) => prev.filter((p) => p.id !== newPencil.id));
              }, 2000);
            }
          })
          .subscribe();

        channelRef.current = channel;
        setLoading(false);

        // Track game play for badge
        if (user) {
          trackGamePlay(user.id, 'art-duel');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize game.');
        setLoading(false);
      }
    };

    initializeGame();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, connectedUsers]);

  // Timer countdown
  useEffect(() => {
    if (loading || !sessionId) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, sessionId]);

  const handleComplete = async () => {
    if (drawingCompleteRef.current || !canvasRef.current || !sessionId || !user || !myBuildingId) return;
    drawingCompleteRef.current = true;

    try {
      // Save drawing to database
      const canvasData = canvasRef.current.toDataURL('image/png');

      const { error: saveError } = await supabase
        .from('art_duel_drawings')
        .upsert({
          session_id: sessionId,
          user_id: user.id,
          building_id: myBuildingId,
          canvas_data: canvasData,
        }, {
          onConflict: 'session_id,user_id',
        });

      if (saveError) {
        console.error('Error saving drawing:', saveError);
      }

      // Mark session as completed
      await supabase
        .from('art_duel_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', sessionId);

      // Track challenge completion (with XP reward)
      if (user) {
        trackChallenge(user.id, 'art-duel', 50); // 50 XP for completing art duel
      }

      // Navigate to voting page (session param is optional, shows all today's drawings)
      router.push('/games/art-duel/vote');
    } catch (err) {
      console.error('Error completing drawing:', err);
    }
  };

  const broadcastCursor = useCallback(
    (x: number, y: number, prevX: number | null, prevY: number | null, drawing: boolean) => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor_move',
        payload: {
          participant_id: user?.id,
          x,
          y,
          prevX,
          prevY,
          is_drawing: drawing,
        },
      });
    },
    [user]
  );

  const broadcastPencilDrop = useCallback(
    (x: number, y: number) => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'pencil_drop',
        payload: {
          participant_id: user?.id,
          x,
          y,
        },
      });
    },
    [user]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const scaleX = 800 / rect.width;
      const scaleY = 500 / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      lastPosRef.current = { x, y };
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      broadcastCursor(x, y, null, null, true);

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'hsl(120, 100%, 50%)';
        ctx.fill();
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = 800 / rect.width;
    const scaleY = 500 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (isDrawing) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && lastPosRef.current) {
        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = 'hsl(120, 100%, 50%)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      broadcastCursor(x, y, lastPosRef.current?.x ?? null, lastPosRef.current?.y ?? null, true);
      lastPosRef.current = { x, y };
      setChaosLevel((prev) => Math.min(100, prev + 0.5));
    } else {
      broadcastCursor(x, y, null, null, false);
    }
  };

  const handlePointerUp = () => {
    if (isDrawing && lastPosRef.current && mousePos) {
      const newPencil: DroppedPencil = {
        id: pencilIdRef.current++,
        x: mousePos.x,
        y: mousePos.y,
        rotation: Math.random() * 60 - 30,
      };
      setDroppedPencils((prev) => [...prev, newPencil]);

      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const scaleX = 800 / rect.width;
        const scaleY = 500 / rect.height;
        broadcastPencilDrop(mousePos.x * scaleX, mousePos.y * scaleY);
      }

      setTimeout(() => {
        setDroppedPencils((prev) => prev.filter((p) => p.id !== newPencil.id));
      }, 2000);

      broadcastCursor(lastPosRef.current.x, lastPosRef.current.y, null, null, false);
    }
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const handlePointerLeave = () => {
    if (isDrawing) {
      handlePointerUp();
    }
    setMousePos(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timerColor =
    timeLeft <= 10
      ? 'text-destructive'
      : timeLeft <= 30
      ? 'text-yellow-500'
      : 'text-primary';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-mono">LOADING ART DUEL...</p>
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <MatrixRain />
      
      <div className="relative z-10 pt-6 pb-10 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
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
              <h1 className="font-display text-xl text-primary">ART DUEL</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-[0.25em]">
                DAILY_CHALLENGE / DRAWING
              </p>
            </div>
            <div className={`font-mono text-3xl font-bold ${timerColor} ${timeLeft <= 10 ? 'glitch' : ''}`}>
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Challenge prompt */}
          <div className="text-center">
            <div className="inline-block px-6 py-3 bg-card border border-primary/30 rounded-lg">
              <p className="text-muted-foreground text-sm mb-1">WORD OF THE DAY:</p>
              <p className="text-foreground text-xl font-display font-bold">
                "{dailyWord?.toUpperCase()}"
              </p>
            </div>
          </div>

          {/* Canvas container */}
          <div className="relative">
            {/* Partner cursor */}
            {partnerCursor && (
              <div
                className="absolute pointer-events-none z-10 transition-all duration-75"
                style={{
                  left: (partnerCursor.x / 800) * 100 + '%',
                  top: (partnerCursor.y / 500) * 100 + '%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {partnerCursor.is_drawing ? (
                  <div className="relative">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-cyan-500 transform -rotate-45 -translate-x-1 -translate-y-6"
                    >
                      <path
                        d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="1"
                      />
                    </svg>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-cyan-500 text-xs font-mono whitespace-nowrap animate-pulse">
                      ✏️ drawing...
                    </div>
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-cyan-500 bg-transparent" />
                )}
              </div>
            )}

            {/* My pencil cursor */}
            {mousePos && isDrawing && (
              <div
                className="absolute pointer-events-none z-20"
                style={{
                  left: mousePos.x,
                  top: mousePos.y,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-primary transform -rotate-45"
                >
                  <path
                    d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            )}

            {/* Dropped pencils */}
            {droppedPencils.map((pencil) => (
              <div
                key={pencil.id}
                className="absolute pointer-events-none z-30"
                style={{
                  left: pencil.x,
                  top: pencil.y,
                  transform: `rotate(${pencil.rotation}deg)`,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-primary/60"
                >
                  <path
                    d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            ))}

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className={`w-full bg-card border border-primary/30 rounded-lg touch-none ${
                isDrawing ? 'cursor-none' : 'cursor-crosshair'
              }`}
              style={{
                boxShadow: `0 0 ${20 + chaosLevel * 0.3}px hsl(var(--primary) / ${
                  0.2 + chaosLevel * 0.003
                })`,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
            />

            {/* Chaos meter */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-background/80 px-3 py-2 rounded border border-muted">
              <span className="text-muted-foreground text-xs font-mono">CHAOS:</span>
              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary via-accent to-destructive transition-all duration-300"
                  style={{ width: `${chaosLevel}%` }}
                />
              </div>
            </div>
          </div>

          {/* Color legend */}
          <div className="flex items-center justify-center gap-8 text-sm font-mono">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-muted-foreground">your strokes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <span className="text-muted-foreground">their strokes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scanlines overlay */}
      <div className="fixed inset-0 pointer-events-none scanlines opacity-30 z-50" />
    </div>
  );
};

export default ArtDuel;

