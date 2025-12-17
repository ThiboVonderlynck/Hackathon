'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ConnectedUser {
  userId: string;
  buildingId: string;
  timestamp: number;
  locationVerified: boolean; // Only true if location is successfully verified
}

interface UserContextType {
  connectedUsers: ConnectedUser[];
  addUser: (buildingId: string, locationVerified: boolean) => void;
  removeUser: (userId: string) => void;
  getUserCountForBuilding: (buildingId: string) => number;
  totalConnectedUsers: number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'nerdhub_connected_users';
const USER_ID_KEY = 'nerdhub_user_id';
const HEARTBEAT_INTERVAL = 30000; // 30 seconden
const USER_TIMEOUT = 120000; // 2 minuten zonder heartbeat = offline

export function UserProvider({ children }: { children: ReactNode }) {
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const { user } = useAuth();
  const currentUserId = user?.id || null;
  const socketRef = useRef<Socket | null>(null);
  const currentBuildingRef = useRef<string | null>(null);
  const supabaseChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Only initialize Supabase tracking if user is authenticated
  const isAuthenticated = !!user;

  // Initialize Supabase Realtime for online users
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUserId || !isAuthenticated) return;

    // Load initial users from Supabase (profiles table)
    const loadInitialUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, current_building_id, location_verified, last_seen')
          .eq('is_online', true)
          .gte('last_seen', new Date(Date.now() - USER_TIMEOUT).toISOString());

        if (error) {
          console.error('Error loading users from Supabase:', error);
          return;
        }

        const users: ConnectedUser[] = (data || [])
          .filter((profile) => profile.current_building_id) // Only include users with a building
          .map((profile) => ({
            userId: profile.user_id,
            buildingId: profile.current_building_id!,
            timestamp: new Date(profile.last_seen).getTime(),
            locationVerified: profile.location_verified,
          }));

        setConnectedUsers(users);
      } catch (error) {
        console.error('Error loading initial users:', error);
      }
    };

    loadInitialUsers();

    // Setup Supabase Realtime channel for profiles table
    const channel = supabase
      .channel('profiles_online_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'is_online=eq.true',
        },
        async (payload) => {
          // Reload users when changes occur
          const { data, error } = await supabase
            .from('profiles')
            .select('user_id, current_building_id, location_verified, last_seen')
            .eq('is_online', true)
            .gte('last_seen', new Date(Date.now() - USER_TIMEOUT).toISOString());

          if (!error && data) {
            const users: ConnectedUser[] = data
              .filter((profile) => profile.current_building_id)
              .map((profile) => ({
                userId: profile.user_id,
                buildingId: profile.current_building_id!,
                timestamp: new Date(profile.last_seen).getTime(),
                locationVerified: profile.location_verified,
              }));
            setConnectedUsers(users);
          }
        }
      )
      .subscribe();

    supabaseChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      supabaseChannelRef.current = null;
    };
  }, [currentUserId]);

  // Initialize Socket.io connection (keep for backward compatibility)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Connect to Socket.io server
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Listen for users updates from server
    socket.on('users_updated', (users: ConnectedUser[]) => {
      const now = Date.now();
      const activeUsers = users.filter(
        (user) => now - user.timestamp < USER_TIMEOUT
      );
      setConnectedUsers(activeUsers);
      // Also update localStorage as backup
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeUsers));
    });

    socket.on('connect', () => {
      console.log('Socket.io connected');
      // If user was already added to a building, rejoin
      if (currentUserId && currentBuildingRef.current) {
        socket.emit('user_join', {
          userId: currentUserId,
          buildingId: currentBuildingRef.current,
          locationVerified: true,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket.io disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
    });

    return () => {
      if (currentUserId) {
        socket.emit('user_leave', { userId: currentUserId });
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId]);

  // Laad gebruikers uit localStorage bij mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const users: ConnectedUser[] = JSON.parse(stored);
        // Filter oude gebruikers (ouder dan timeout)
        const now = Date.now();
        const activeUsers = users.filter(
          (user) => now - user.timestamp < USER_TIMEOUT
        );
        setConnectedUsers(activeUsers);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activeUsers));
      }
    } catch (error) {
      console.error('Error loading users from storage:', error);
    }
  }, []);

  // Heartbeat: update timestamp van huidige gebruiker via Supabase en Socket.io
  useEffect(() => {
    if (!currentUserId || !currentBuildingRef.current) return;

    const heartbeat = async () => {
      // Update via Supabase (profiles table)
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            is_online: true,
            current_building_id: currentBuildingRef.current,
            location_verified: true,
            last_seen: new Date().toISOString(),
          })
          .eq('user_id', currentUserId);

        if (error) {
          console.error('Error updating heartbeat in Supabase:', error);
        }
      } catch (error) {
        console.error('Error in heartbeat:', error);
      }

      // Also update via Socket.io (backward compatibility)
      if (socketRef.current?.connected) {
        socketRef.current.emit('heartbeat', { userId: currentUserId });
      }
    };

    // Initial heartbeat
    heartbeat();

    const interval = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [currentUserId]);

  // Cleanup oude gebruikers periodiek (lokaal en Supabase)
  useEffect(() => {
    const cleanup = async () => {
      // Cleanup in Supabase (database function handles this, but we can also do it client-side)
      try {
        const { error } = await supabase.rpc('cleanup_offline_users');
        if (error) {
          console.error('Error cleaning up offline users:', error);
        }
      } catch (error) {
        console.error('Error calling cleanup function:', error);
      }

      // Also cleanup locally
      setConnectedUsers((prev) => {
        const now = Date.now();
        const active = prev.filter(
          (user) => now - user.timestamp < USER_TIMEOUT
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
        return active;
      });
    };

    // Run cleanup immediately and then periodically
    cleanup();
    const interval = setInterval(cleanup, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Luister naar storage events voor cross-tab synchronisatie
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const users: ConnectedUser[] = JSON.parse(e.newValue);
          const now = Date.now();
          const active = users.filter(
            (user) => now - user.timestamp < USER_TIMEOUT
          );
          setConnectedUsers(active);
        } catch (error) {
          console.error('Error parsing storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const removeUser = async (userId: string) => {
    // Mark as offline in Supabase (profiles table)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_online: false,
          current_building_id: null,
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing user from Supabase:', error);
      }
    } catch (error) {
      console.error('Error removing user:', error);
    }

    // Also remove via Socket.io (backward compatibility)
    if (socketRef.current?.connected) {
      socketRef.current.emit('user_leave', { userId });
    }

    setConnectedUsers((prev) => {
      const updated = prev.filter((user) => user.userId !== userId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    currentBuildingRef.current = null;
  };

  // Cleanup bij unmount en wanneer tab sluit
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Remove user when tab closes
      if (currentUserId) {
        // Use navigator.sendBeacon for reliable cleanup on tab close
        const removeUserData = async () => {
          try {
            await supabase
              .from('profiles')
              .update({
                is_online: false,
                current_building_id: null,
              })
              .eq('user_id', currentUserId);
          } catch (error) {
            console.error('Error removing user on tab close:', error);
          }
        };
        
        // Try to remove synchronously if possible
        removeUserData();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('visibilitychange', () => {
      // Also cleanup when page becomes hidden (tab switch, minimize, etc.)
      if (document.hidden && currentUserId) {
        // Don't remove immediately, but mark as potentially inactive
        // The heartbeat will stop, and cleanup will happen after timeout
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (currentUserId) {
        removeUser(currentUserId);
      }
    };
  }, [currentUserId]);

  const addUser = async (buildingId: string, locationVerified: boolean) => {
    if (!currentUserId) return;

    // Only add if location is verified
    if (!locationVerified) {
      console.warn('Cannot add user without verified location');
      return;
    }

    currentBuildingRef.current = buildingId;

    // Add/update user in Supabase (profiles table)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_online: true,
          current_building_id: buildingId,
          location_verified: true,
          last_seen: new Date().toISOString(),
        })
        .eq('user_id', currentUserId);

      if (error) {
        console.error('Error adding user to Supabase:', error);
      }
    } catch (error) {
      console.error('Error adding user:', error);
    }

    // Also send via Socket.io (backward compatibility)
    if (socketRef.current?.connected) {
      socketRef.current.emit('user_join', {
        userId: currentUserId,
        buildingId,
        locationVerified: true,
      });
    } else {
      // Fallback to localStorage if socket not connected
      setConnectedUsers((prev) => {
        // Remove user from other buildings
        const filtered = prev.filter((user) => user.userId !== currentUserId);
        
        // Add to new building
        const updated = [
          ...filtered,
          {
            userId: currentUserId,
            buildingId,
            timestamp: Date.now(),
            locationVerified: true,
          },
        ];

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const getUserCountForBuilding = (buildingId: string): number => {
    const now = Date.now();
    return connectedUsers.filter(
      (user) =>
        user.buildingId === buildingId &&
        user.locationVerified &&
        now - user.timestamp < USER_TIMEOUT
    ).length;
  };

  const totalConnectedUsers = connectedUsers.filter((user) => {
    const now = Date.now();
    return user.locationVerified && now - user.timestamp < USER_TIMEOUT;
  }).length;

  return (
    <UserContext.Provider
      value={{
        connectedUsers,
        addUser,
        removeUser,
        getUserCountForBuilding,
        totalConnectedUsers,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
}

