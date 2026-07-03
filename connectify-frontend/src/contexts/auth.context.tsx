'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useQueryClient } from '@tanstack/react-query';

export interface User {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  isVerified: boolean;
  role: 'USER' | 'ADMIN';
  avatar?: string;
  bio?: string;
  website?: string;
  phone?: string;
  gender?: string;
  isPrivate?: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  followers?: string[];
  following?: string[];
  followRequests?: { _id: string; username: string; fullName: string; avatar?: string }[];
  blockedUsers?: string[];
  mutedUsers?: string[];
  restrictedUsers?: string[];
  preferences?: {
    pushNotifications: boolean;
    emailNotifications: boolean;
    likeNotifications: boolean;
    followNotifications: boolean;
    commentNotifications: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  switchAccount: (accessToken: string, refreshToken: string, user: User) => void;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const loadSessions = (): Session[] => {
    try {
      const stored = localStorage.getItem('connectify_sessions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveSessions = (sessions: Session[]) => {
    localStorage.setItem('connectify_sessions', JSON.stringify(sessions));
  };

  const fetchUser = React.useCallback(async () => {
    try {
      // First check if we have a saved token in localStorage to restore the session
      const storedAccessToken = localStorage.getItem('connectify_access_token');
      if (!storedAccessToken) {
        // No token stored, no need to call the API — user is not logged in
        setUser(null);
        setIsLoading(false);
        return;
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${storedAccessToken}`;

      // Add a timeout so the app doesn't hang forever if the backend is slow (e.g., Render free tier cold start)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      try {
        const response = await api.get('/auth/me', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.data.success) {
          const fetchedUser = response.data.data.user;
          setUser(fetchedUser);
          
          // Re-read tokens from localStorage — the interceptor may have refreshed them
          const currentAccessToken = localStorage.getItem('connectify_access_token');
          const currentRefreshToken = localStorage.getItem('connectify_refresh_token') || '';
          if (currentAccessToken) {
            const sessions = loadSessions();
            const existingIndex = sessions.findIndex(s => s.user.username === fetchedUser.username);
            if (existingIndex >= 0) {
              sessions[existingIndex] = { accessToken: currentAccessToken, refreshToken: currentRefreshToken, user: fetchedUser };
            } else {
              sessions.push({ accessToken: currentAccessToken, refreshToken: currentRefreshToken, user: fetchedUser });
            }
            saveSessions(sessions);
          }
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        // If it was a timeout/abort, just treat as not logged in
        if (err?.name === 'AbortError' || err?.name === 'CanceledError') {
          console.warn('Auth check timed out — backend may be waking up');
        }
        throw err;
      }
    } catch {
      setUser(null);
      api.defaults.headers.common['Authorization'] = '';
      localStorage.removeItem('connectify_access_token');
      localStorage.removeItem('connectify_refresh_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/rules-of-hooks, react-hooks/set-state-in-effect
    fetchUser();
  }, [fetchUser]);

  React.useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      api.defaults.headers.common['Authorization'] = '';
      localStorage.removeItem('connectify_access_token');
      localStorage.removeItem('connectify_refresh_token');
      // We don't clear all sessions, just redirect to login so they can select an account or add one
      router.push('/login');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [router]);

  const login = React.useCallback((accessToken: string, refreshToken: string, userData: User) => {
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    localStorage.setItem('connectify_access_token', accessToken);
    localStorage.setItem('connectify_refresh_token', refreshToken);
    setUser(userData);
    queryClient.clear(); // Clear all caches on login so feed is completely fresh

    const sessions = loadSessions();
    const existingIndex = sessions.findIndex(s => s.user.username === userData.username);
    if (existingIndex >= 0) {
      sessions[existingIndex] = { accessToken, refreshToken, user: userData };
    } else {
      sessions.push({ accessToken, refreshToken, user: userData });
    }
    saveSessions(sessions);
  }, [queryClient]);

  const logout = React.useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    } finally {
      api.defaults.headers.common['Authorization'] = '';
      const currentUsername = user?.username;
      setUser(null);
      localStorage.removeItem('connectify_access_token');
      localStorage.removeItem('connectify_refresh_token');
      
      if (currentUsername) {
        const sessions = loadSessions().filter(s => s.user.username !== currentUsername);
        saveSessions(sessions);
      }
      
      router.push('/login');
    }
  }, [router, user]);

  const updateUser = React.useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updatedUser = { ...prev, ...updates };
      
      // Update in sessions as well
      const sessions = loadSessions();
      const existingIndex = sessions.findIndex(s => s.user.username === updatedUser.username);
      if (existingIndex >= 0) {
        sessions[existingIndex].user = updatedUser;
        saveSessions(sessions);
      }
      
      return updatedUser;
    });
  }, []);

  const switchAccount = React.useCallback((accessToken: string, refreshToken: string, userData: User) => {
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    localStorage.setItem('connectify_access_token', accessToken);
    localStorage.setItem('connectify_refresh_token', refreshToken);
    setUser(userData);
    queryClient.clear(); // Clear all caches perfectly without page reload
    router.push('/home');
  }, [queryClient, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
        switchAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
