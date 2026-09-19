import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { env } from '../config/env';
import prisma from '../config/prisma';

let io: Server | null = null;

// Track online users: userId → Set of socketIds
const onlineUsers = new Map<string, Set<string>>();

export function getSocketInstance(): Server | null {
  return io;
}

export function getOnlineUserCount(): number {
  return onlineUsers.size;
}

export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  userRole?: string;
  managedProjectIds?: string[];
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: [
        env.CLIENT_URL,
        'https://velozity-dashboard-kohl.vercel.app',
        'http://localhost:5173',
      ],
      credentials: true,
    },
  });

  // ─── Authentication Middleware ────────────────────────────────────────────
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      socket.userName = payload.name;
      socket.userRole = payload.role;

      // For PMs: pre-load their project IDs so we can scope rooms correctly
      if (payload.role === 'PROJECT_MANAGER') {
        const projects = await prisma.project.findMany({
          where: { managerId: payload.userId },
          select: { id: true },
        });
        socket.managedProjectIds = projects.map((p) => p.id);
      }

      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ───────────────────────────────────────────────────
  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const role = socket.userRole!;

    // Track presence
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Personal room — for direct notifications
    socket.join(`user:${userId}`);

    // Role-based rooms
    if (role === 'ADMIN') {
      socket.join('admin:global');
    }

    // ── Join project rooms ────────────────────────────────────────────────
    // Client sends which project they're currently viewing
    socket.on('project:join', async (projectId: string) => {
      if (!projectId) return;

      const canJoin = await canAccessProjectRoom(userId, role, projectId, socket.managedProjectIds);
      if (canJoin) {
        socket.join(`project:${projectId}`);
      }
    });

    socket.on('project:leave', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    // ── Missed events catchup ─────────────────────────────────────────────
    // Client sends their last-seen timestamp on reconnect; server replies
    // with up to 20 missed activity events fetched from the DB (not memory)
    socket.on('activity:catchup', async (since: string) => {
      try {
        const where = buildActivityWhere(userId, role, socket.managedProjectIds);
        const missed = await prisma.activityLog.findMany({
          where: {
            ...where,
            createdAt: { gt: new Date(since) },
          },
          orderBy: { createdAt: 'asc' },
          take: 20,
          include: {
            user: { select: { id: true, name: true } },
            task: { select: { id: true, title: true } },
            project: { select: { id: true, name: true } },
          },
        });

        socket.emit('activity:missed', missed);
      } catch (err) {
        console.error('[Socket] activity:catchup error', err);
      }
    });

    // ── Presence broadcast ────────────────────────────────────────────────
    // Tell admins the updated online count
    broadcastPresence();

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }
      broadcastPresence();
    });
  });

  console.log('[Socket.io] Initialized');
  return io;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function broadcastPresence() {
  if (!io) return;
  io.to('admin:global').emit('presence:update', { onlineCount: onlineUsers.size });
}

async function canAccessProjectRoom(
  userId: string,
  role: string,
  projectId: string,
  managedProjectIds?: string[]
): Promise<boolean> {
  if (role === 'ADMIN') return true;

  if (role === 'PROJECT_MANAGER') {
    return managedProjectIds?.includes(projectId) ?? false;
  }

  // DEVELOPER: can only join rooms for projects where they have assigned tasks
  const task = await prisma.task.findFirst({
    where: { projectId, assignedToId: userId },
    select: { id: true },
  });
  return task !== null;
}

function buildActivityWhere(
  userId: string,
  role: string,
  managedProjectIds?: string[]
): Record<string, unknown> {
  if (role === 'ADMIN') return {};

  if (role === 'PROJECT_MANAGER') {
    return {
      projectId: { in: managedProjectIds ?? [] },
    };
  }

  // DEVELOPER: only activity on their assigned tasks
  return {
    task: { assignedToId: userId },
  };
}
