'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  tag: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any; requiresEmailConfirmation?: boolean; message?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (data: { username?: string; avatar_url?: string; tag?: string }) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    try {
      // Check if Supabase is properly configured
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
        console.warn('Supabase not configured, skipping profile load');
        setProfile(null);
        return;
      }

      // Query with explicit timeout handling
      const queryPromise = supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url, tag, created_at')
        .eq('user_id', userId)
        .maybeSingle();

      // Add a timeout wrapper (shorter timeout since this is non-blocking)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 5000);
      });

      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      const { data, error } = result || {};

      // Check for rocket badge (first login) - do this before checking for errors
      try {
        await supabase.rpc('check_rocket_badge', { user_uuid: userId });
      } catch (badgeError) {
        // Ignore badge errors (table might not exist yet)
        console.warn('Could not check rocket badge:', badgeError);
      }

      if (error) {
        // PGRST116 = no rows returned (profile doesn't exist yet) - this is normal
        // PGRST202 = function/table not found - table might not exist yet
        // PGRST301 = permission denied - RLS policy issue
        if (error.code === 'PGRST116') {
          // This is normal - profile doesn't exist yet
          setProfile(null);
        } else if (error.code === 'PGRST202') {
          console.warn('Profiles table might not exist yet. Please run the migration SQL.');
          setProfile(null);
        } else if (error.code === 'PGRST301') {
          console.warn('Permission denied. Check RLS policies on profiles table.');
          setProfile(null);
        } else {
          console.error('Error loading profile:', error.code, error.message);
          setProfile(null);
        }
      } else {
        setProfile(data || null);
      }
    } catch (error: any) {
      if (error.message?.includes('timeout')) {
        // Silently fail - profile load shouldn't block the app
        console.warn('Profile query timed out. User can still use the app, but profile features may be limited.');
        setProfile(null);
      } else {
        console.error('Error loading profile:', error);
        setProfile(null);
      }
    }
    // Note: We don't set loading to false here because this is a background operation
    // Loading is already set to false after the auth check completes
  };

  // Load user and profile on mount
  useEffect(() => {
    let mounted = true;

    // Get initial session - this is the primary auth check
    const initAuth = async () => {
      try {
        // First, check if user is authenticated (this is fast)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // Set user immediately - don't wait for profile
        setUser(session?.user ?? null);
        
        // Always set loading to false after auth check, even if profile fails
        setLoading(false);

        // Load profile in background (non-blocking)
        if (session?.user) {
          // Don't await - let it load in background
          loadProfile(session.user.id).catch(err => {
            console.error('Background profile load failed:', err);
            // Profile load failure shouldn't block the app
          });
        } else {
          setProfile(null);
        }
      } catch (error: any) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Update user immediately
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Load profile in background
      if (session?.user) {
        loadProfile(session.user.id).catch(err => {
          console.error('Background profile load failed:', err);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
    
    if (error) {
      return { error };
    }
    
    // If we get a session, email confirmation is disabled - user is automatically logged in
    if (data.session) {
      // User is automatically logged in (email confirmation disabled)
      return { 
        error: null,
        requiresEmailConfirmation: false,
        message: 'Account created successfully!'
      };
    }
    
    // If we get a user but no session, email confirmation is required
    if (data.user && !data.session) {
      return { 
        error: null,
        requiresEmailConfirmation: true,
        message: 'Please check your email to confirm your account. If you don\'t see it, check your spam folder.'
      };
    }
    
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (data: { username?: string; avatar_url?: string; tag?: string }) => {
    if (!user) return { error: { message: 'No user logged in' } };

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: user.id,
          ...data,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

    if (!error) {
      await loadProfile(user.id);
    }

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

