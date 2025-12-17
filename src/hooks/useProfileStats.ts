'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfileStats {
  xp: number;
  level: number;
  xpForNextLevel: number;
  totalChallenges: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
}

export function useProfileStats() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!user || !profile) {
        setLoading(false);
        return;
      }

      try {
        // Get profile with stats
        const { data, error } = await supabase
          .from('profiles')
          .select('xp, total_challenges, current_streak, longest_streak, total_points')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          // Calculate level
          const xp = data.xp || 0;
          const level = calculateLevel(xp);
          const xpForNextLevel = xpForNextLevelCalc(xp);

          setStats({
            xp,
            level,
            xpForNextLevel,
            totalChallenges: data.total_challenges || 0,
            currentStreak: data.current_streak || 0,
            longestStreak: data.longest_streak || 0,
            totalPoints: data.total_points || 0,
          });
        }
      } catch (error) {
        console.error('Error loading profile stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user, profile]);

  return { stats, loading };
}

// Calculate level from XP
// Level formula: level = floor(sqrt(xp / 10)) + 1
// 10xp=level1, 30xp=level2, 60xp=level3, 100xp=level4, etc.
function calculateLevel(xp: number): number {
  if (xp < 10) return 1;
  return Math.floor(Math.sqrt(xp / 10)) + 1;
}

// Calculate XP needed for next level
function xpForNextLevelCalc(xp: number): number {
  const currentLevel = calculateLevel(xp);
  const nextLevel = currentLevel + 1;
  // XP needed for next level: (next_level - 1)^2 * 10
  const xpForNext = (nextLevel - 1) * (nextLevel - 1) * 10;
  return xpForNext - xp;
}

