import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import type { ActivityLog } from '../types';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  onlineCount: number;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  recentActivity: ActivityLog[];
}

const SocketContext = createContext<SocketContextValue | null>(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const lastSeenRef = useRef<string | null>(
    localStorage.getItem('lastSeenActivity')
  );

  useEffect(() => {
    // Only connect when we have a valid token AND user is loaded
    if (!accessToken || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Don't create a second socket if already connected with same token
    if (socketRef.current?.connected) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      const lastSeen = lastSeenRef.current;
      if (lastSeen) {
        newSocket.emit('activity:catchup', lastSeen);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    newSocket.on('presence:update', ({ onlineCount }: { onlineCount: number }) => {
      setOnlineCount(onlineCount);
    });

    newSocket.on('activity:new', (event: ActivityLog) => {
      setRecentActivity((prev) => [event, ...prev].slice(0, 50));
      const ts = event.createdAt;
      if (!lastSeenRef.current || ts > lastSeenRef.current) {
        lastSeenRef.current = ts;
        localStorage.setItem('lastSeenActivity', ts);
      }
    });

    newSocket.on('activity:missed', (events: ActivityLog[]) => {
      if (events.length > 0) {
        setRecentActivity((prev) => {
          const combined = [...events, ...prev];
          const seen = new Set<string>();
          return combined
            .filter((e) => {
              if (seen.has(e.id)) return false;
              seen.add(e.id);
              return true;
            })
            .slice(0, 50);
        });
      }
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [accessToken, user]);

  const joinProject = useCallback((projectId: string) => {
    socketRef.current?.emit('project:join', projectId);
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    socketRef.current?.emit('project:leave', projectId);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineCount,
        joinProject,
        leaveProject,
        recentActivity,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
