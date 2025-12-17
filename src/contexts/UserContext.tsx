'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const currentBuildingRef = useRef<string | null>(null);

  // Generate or retrieve user ID
  useEffect(() => {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(USER_ID_KEY, userId);
    }
    setCurrentUserId(userId);
  }, []);

  // Initialize Socket.io connection
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

  // Heartbeat: update timestamp van huidige gebruiker via Socket.io
  useEffect(() => {
    if (!currentUserId || !socketRef.current) return;

    const heartbeat = setInterval(() => {
      if (socketRef.current?.connected && currentBuildingRef.current) {
        socketRef.current.emit('heartbeat', { userId: currentUserId });
      }
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(heartbeat);
  }, [currentUserId]);

  // Cleanup oude gebruikers periodiek (backup, server does this too)
  useEffect(() => {
    const cleanup = setInterval(() => {
      setConnectedUsers((prev) => {
        const now = Date.now();
        const active = prev.filter(
          (user) => now - user.timestamp < USER_TIMEOUT
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
        return active;
      });
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(cleanup);
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

  const removeUser = (userId: string) => {
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

  // Cleanup bij unmount
  useEffect(() => {
    return () => {
      if (currentUserId) {
        removeUser(currentUserId);
      }
    };
  }, [currentUserId]);

  const addUser = (buildingId: string, locationVerified: boolean) => {
    if (!currentUserId) return;

    // Only add if location is verified
    if (!locationVerified) {
      console.warn('Cannot add user without verified location');
      return;
    }

    currentBuildingRef.current = buildingId;

    // Send to server via Socket.io
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

