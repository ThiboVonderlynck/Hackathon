'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: string;
  earned: boolean;
  earned_at?: string;
}

export function useBadges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBadges = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Load all badge definitions
        const { data: badgeDefinitions, error: defError } = await supabase
          .from('badges')
          .select('*')
          .order('id');

        if (defError) throw defError;

        // Load user's earned badges
        const { data: earnedBadges, error: earnedError } = await supabase
          .from('user_badges')
          .select('badge_id, earned_at')
          .eq('user_id', user.id);

        if (earnedError) throw earnedError;

        const earnedBadgeIds = new Set(earnedBadges?.map(b => b.badge_id) || []);

        // Combine badges with earned status
        const badgesWithStatus: Badge[] = (badgeDefinitions || []).map(badge => {
          const earned = earnedBadgeIds.has(badge.id);
          const earnedBadge = earnedBadges?.find(eb => eb.badge_id === badge.id);
          return {
            ...badge,
            earned,
            earned_at: earnedBadge?.earned_at,
          };
        });

        setBadges(badgesWithStatus);
      } catch (error) {
        console.error('Error loading badges:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBadges();
  }, [user]);

  const checkBadges = async () => {
    if (!user) return;

    try {
      // Check all badges
      await supabase.rpc('check_rocket_badge', { user_uuid: user.id });
      await supabase.rpc('check_gaming_console_badge', { user_uuid: user.id });
      await supabase.rpc('check_joy_smile_badge', { user_uuid: user.id });
      await supabase.rpc('check_crown_badge', { user_uuid: user.id });
      await supabase.rpc('check_fire_badge', { user_uuid: user.id });
      await supabase.rpc('check_ninja_badge', { user_uuid: user.id });

      // Reload badges
      const { data: badgeDefinitions } = await supabase
        .from('badges')
        .select('*')
        .order('id');

      const { data: earnedBadges } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', user.id);

      const earnedBadgeIds = new Set(earnedBadges?.map(b => b.badge_id) || []);

      const badgesWithStatus: Badge[] = (badgeDefinitions || []).map(badge => {
        const earned = earnedBadgeIds.has(badge.id);
        const earnedBadge = earnedBadges?.find(eb => eb.badge_id === badge.id);
        return {
          ...badge,
          earned,
          earned_at: earnedBadge?.earned_at,
        };
      });

      setBadges(badgesWithStatus);
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  };

  return { badges, loading, checkBadges };
}

