'use client';

import { supabase } from '@/lib/supabase';

/**
 * Track that a user has played a game
 */
export async function trackGamePlay(userId: string, gameType: 'word-chain' | 'meme-battle' | 'art-duel' | 'speed-quiz') {
  try {
    await supabase
      .from('user_game_plays')
      .upsert({
        user_id: userId,
        game_type: gameType,
      }, {
        onConflict: 'user_id,game_type',
      });

    // Check for gaming console badge
    await supabase.rpc('check_gaming_console_badge', { user_uuid: userId });
  } catch (error) {
    console.error('Error tracking game play:', error);
  }
}

/**
 * Track a user reaction (for joy smile badge)
 */
export async function trackReaction(userId: string, reactionType: 'laugh' | 'like' | 'love') {
  try {
    await supabase
      .from('user_reactions')
      .insert({
        user_id: userId,
        reaction_type: reactionType,
      });

    // Check for joy smile badge if it's a laugh reaction
    if (reactionType === 'laugh') {
      await supabase.rpc('check_joy_smile_badge', { user_uuid: userId });
    }
  } catch (error) {
    console.error('Error tracking reaction:', error);
  }
}

/**
 * Update user streak
 */
export async function updateStreak(userId: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existingStreak } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingStreak) {
      const lastDate = new Date(existingStreak.last_activity_date).toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      if (lastDate === today) {
        // Already updated today
        return;
      } else if (lastDate === yesterday) {
        // Continue streak
        await supabase
          .from('user_streaks')
          .update({
            current_streak: existingStreak.current_streak + 1,
            last_activity_date: today,
          })
          .eq('user_id', userId);
      } else {
        // Reset streak
        await supabase
          .from('user_streaks')
          .update({
            current_streak: 1,
            last_activity_date: today,
          })
          .eq('user_id', userId);
      }
    } else {
      // Create new streak
      await supabase
        .from('user_streaks')
        .insert({
          user_id: userId,
          current_streak: 1,
          last_activity_date: today,
        });
    }

    // Check for fire badge
    await supabase.rpc('check_fire_badge', { user_uuid: userId });
  } catch (error) {
    console.error('Error updating streak:', error);
  }
}

/**
 * Track completed challenge
 */
export async function trackChallenge(userId: string, challengeType: string) {
  try {
    await supabase
      .from('user_challenges')
      .insert({
        user_id: userId,
        challenge_type: challengeType,
      });

    // Check for ninja badge
    await supabase.rpc('check_ninja_badge', { user_uuid: userId });
  } catch (error) {
    console.error('Error tracking challenge:', error);
  }
}

/**
 * Check crown badge (call after voting ends for a day)
 */
export async function checkCrownBadge(userId: string) {
  try {
    await supabase.rpc('check_crown_badge', { user_uuid: userId });
  } catch (error) {
    console.error('Error checking crown badge:', error);
  }
}

