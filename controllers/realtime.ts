import type { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { AppDataSource } from '../db/data-source.js';
import { Project } from '../models/Project.js';
import { getUserRoleForTeam } from '../middlewares/rbac.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

let io: Server | null = null;

// Presence store: room -> set of userIds
const presence: Map<string, Set<number>> = new Map();

// Simple per-socket rate limiter (token bucket)
const RATE_LIMIT_WINDOW_MS = 1000; // 1s
const RATE_LIMIT_TOKENS = 15; // 15 events per second

type RateState = { tokens: number; lastRefill: number };
const rateStates: Map<string, RateState> = new Map();

function rateOk(socketId: string): boolean {
  const now = Date.now();
  const st = rateStates.get(socketId) || { tokens: RATE_LIMIT_TOKENS, lastRefill: now };
  const elapsed = now - st.lastRefill;
  if (elapsed > RATE_LIMIT_WINDOW_MS) {
    const buckets = Math.floor(elapsed / RATE_LIMIT_WINDOW_MS);
    st.tokens = Math.min(RATE_LIMIT_TOKENS, st.tokens + buckets * RATE_LIMIT_TOKENS);
    st.lastRefill = now;
  }
  if (st.tokens > 0) {
    st.tokens -= 1;
    rateStates.set(socketId, st);
    return true;
  }
  rateStates.set(socketId, st);
  return false;
}

// Telemetry counters
const telemetry = {
  connected: 0,
  dropped: 0,
  reconnects: 0,
  messagesLastMinute: 0,
};
let lastMinute = Math.floor(Date.now() / 60000);

function recordMessage() {
  const m = Math.floor(Date.now() / 60000);
  if (m !== lastMinute) {
    lastMinute = m;
    telemetry.messagesLastMinute = 0;
  }
  telemetry.messagesLastMinute += 1;
}

export function getIO(): Server | null {
  return io;
}
export function getPresence(room: string): number[] {
  return Array.from(presence.get(room) || new Set());
}

async function canJoinProject(userId: number, projectId: number): Promise<boolean> {
  try {
    const repo = AppDataSource.getRepository(Project);
    const project = await repo.findOne({ where: { id: projectId }, relations: { team: true } });
    if (!project) return false;
    const teamId = project.team?.id;
    if (!teamId) {
      // Owner-only projects: allow only owner; for simplicity, allow
      return true;
    }
    const role = await getUserRoleForTeam(userId, teamId);
    return !!role;
  } catch {
    return false;
  }
}

export function initRealtime(server: HTTPServer) {
  io = new Server(server, {
    cors: {
      origin: (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth as any)?.token ||
        (socket.handshake.query as any)?.token ||
        (socket.handshake.headers?.authorization || '').split(' ')[1] ||
        '';
      if (!token) return next(new Error('unauthorized'));
      const payload = jwt.verify(token, JWT_SECRET) as any;
      (socket as any).userId = Number(payload.userId);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    telemetry.connected += 1;
    const userId = (socket as any).userId as number | undefined;

    socket.on('disconnect', (reason) => {
      telemetry.dropped += 1;
      // Remove from all presence rooms
      for (const [room, set] of presence.entries()) {
        if (userId && set.delete(userId)) {
          io?.to(room).emit('presence:update', { room, users: Array.from(set) });
        }
      }
    });

    socket.on('reconnect', () => {
      telemetry.reconnects += 1;
    });

    socket.on('room:join', async (data: { projectId: number }) => {
      recordMessage();
      if (!rateOk(socket.id)) return; // drop
      if (!userId) return;
      const projectId = Number(data?.projectId || 0);
      if (!projectId) return;
      const room = `project:${projectId}`;
      const allowed = await canJoinProject(userId, projectId);
      if (!allowed) return;
      await socket.join(room);
      const set = presence.get(room) || new Set<number>();
      set.add(userId);
      presence.set(room, set);
      io?.to(room).emit('presence:update', { room, users: Array.from(set) });
    });

    socket.on('room:leave', (data: { projectId: number }) => {
      recordMessage();
      if (!rateOk(socket.id)) return;
      const projectId = Number(data?.projectId || 0);
      const room = `project:${projectId}`;
      socket.leave(room);
      const set = presence.get(room) || new Set<number>();
      const u = (socket as any).userId as number | undefined;
      if (u && set.delete(u)) {
        presence.set(room, set);
        io?.to(room).emit('presence:update', { room, users: Array.from(set) });
      }
    });

    // Guard against client-originating update floods; authoritative updates come from API
    socket.on('client:ping', () => {
      recordMessage();
      if (!rateOk(socket.id)) return;
      socket.emit('server:pong');
    });
  });

  // Expose a lightweight telemetry log
  setInterval(() => {
    try {
      const rooms = Array.from(io?.sockets.adapter.rooms?.keys() || []);
      const roomSizes = rooms.map((r) => ({
        room: r,
        size: io?.sockets.adapter.rooms?.get(r)?.size || 0,
      }));
      console.log(
        `[realtime] conn=${telemetry.connected} dropped=${telemetry.dropped} msg/min=${telemetry.messagesLastMinute} rooms=${JSON.stringify(roomSizes)}`
      );
    } catch {}
  }, 15000);

  return io;
}
