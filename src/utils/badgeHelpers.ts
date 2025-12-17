'use client';

import { supabase } from '@/lib/supabase';

/**
 * Add XP to user profile
 */
export async function addXP(userId: string, amount: number, activityType?: string) {
  try {
    await supabase.rpc('add_xp', {
      user_uuid: userId,
      xp_amount: amount,
      activity_type: activityType || null,
    });
  } catch (error) {
    console.error('Error adding XP:', error);
  }
}

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
    
    // No XP for just playing - only for completing games
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
 * Update user streak (called when completing activities)
 * Note: Streak is automatically updated on login via update_streak function
 * This function also updates the user_streaks table for badge checking
 */
export async function updateStreak(userId: string) {
  try {
    // Update streak in profiles table (this handles the main streak logic)
    await supabase.rpc('update_streak', { user_uuid: userId });
    
    // Also update user_streaks table for badge checking
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
        // Reset streak (missed a day)
        await supabase
          .from('user_streaks')
          .update({
            current_streak: 1,
            last_activity_date: today,
          })
          .eq('user_id', userId);
      }
    } else {
      // Create new streak (streak is always at least 1)
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
export async function trackChallenge(userId: string, challengeType: string, xpReward: number = 25) {
  try {
    await supabase
      .from('user_challenges')
      .insert({
        user_id: userId,
        challenge_type: challengeType,
      });

    // Increment challenge count
    await supabase.rpc('increment_challenge_count', { user_uuid: userId });
    
    // Update streak
    await updateStreak(userId);
    
    // Add XP for completing challenge
    await addXP(userId, xpReward, `challenge-${challengeType}`);

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

