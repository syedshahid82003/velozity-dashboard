import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const lastSeenRef = useRef<string | null>(
    localStorage.getItem('lastSeenActivity')
  );

  useEffect(() => {
    if (!accessToken || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);

      // Request missed events on (re)connect
      const lastSeen = lastSeenRef.current;
      if (lastSeen) {
        socket.emit('activity:catchup', lastSeen);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Admin presence count
    socket.on('presence:update', ({ onlineCount }: { onlineCount: number }) => {
      setOnlineCount(onlineCount);
    });

    // Live activity event
    socket.on('activity:new', (event: ActivityLog) => {
      setRecentActivity((prev) => [event, ...prev].slice(0, 50));
      // Track last-seen for catchup on reconnect
      const ts = event.createdAt;
      if (!lastSeenRef.current || ts > lastSeenRef.current) {
        lastSeenRef.current = ts;
        localStorage.setItem('lastSeenActivity', ts);
      }
    });

    // Missed events after reconnect (fetched from DB server-side)
    socket.on('activity:missed', (events: ActivityLog[]) => {
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
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [accessToken, user]);

  const joinProject = (projectId: string) => {
    socketRef.current?.emit('project:join', projectId);
  };

  const leaveProject = (projectId: string) => {
    socketRef.current?.emit('project:leave', projectId);
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
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
