import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api from '../lib/axios';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem('accessToken')
  );
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate user from stored access token on mount
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const meRes = await api.get('/auth/me');
          setUser(meRes.data.data);
        } catch {
          // Access token expired — try refresh cookie
          try {
            const { data } = await axios.post(
              `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth/refresh`,
              {},
              { withCredentials: true }
            );
            const newToken = data.data.accessToken;
            localStorage.setItem('accessToken', newToken);
            setAccessToken(newToken);
            const meRes = await api.get('/auth/me');
            setUser(meRes.data.data);
          } catch {
            localStorage.removeItem('accessToken');
            setAccessToken(null);
          }
        }
      }
      // No token — stay logged out, show login page
      setIsLoading(false);
    };
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { accessToken: token, user: loggedInUser } = data.data;
    localStorage.setItem('accessToken', token);
    setAccessToken(token);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
