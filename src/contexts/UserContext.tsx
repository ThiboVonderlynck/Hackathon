'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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

  // Generate or retrieve user ID
  useEffect(() => {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(USER_ID_KEY, userId);
    }
    setCurrentUserId(userId);
  }, []);

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

  // Heartbeat: update timestamp van huidige gebruiker
  useEffect(() => {
    if (!currentUserId) return;

    const heartbeat = setInterval(() => {
      setConnectedUsers((prev) => {
        const updated = prev.map((user) =>
          user.userId === currentUserId
            ? { ...user, timestamp: Date.now() }
            : user
        );
        // Filter oude gebruikers
        const now = Date.now();
        const active = updated.filter(
          (user) => now - user.timestamp < USER_TIMEOUT
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
        return active;
      });
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(heartbeat);
  }, [currentUserId]);

  // Cleanup oude gebruikers periodiek
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
    setConnectedUsers((prev) => {
      const updated = prev.filter((user) => user.userId !== userId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
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

