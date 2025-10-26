import { io, Socket } from 'socket.io-client';
import { API_BASE, getToken } from './api';

let socket: Socket | null = null;
let currentRoom: string | null = null;

function forward(name: string, detail: any) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {}
}

export function getSocket(): Socket | null {
  if (socket) return socket;
  const token = getToken();
  socket = io(API_BASE.replace(/\/$/, ''), {
    transports: ['websocket'],
    auth: token ? { token } : undefined,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
  });

  // Throttled dispatcher to avoid UI floods
  let tasksTick: any = null;
  const dispatchTasksChanged = (payload: any) => {
    if (tasksTick) return;
    tasksTick = setTimeout(() => {
      tasksTick = null;
      forward('tasks:changed', payload);
    }, 300);
  };

  // Task events → forward to app-wide listeners
  socket.on('task:created', (payload) => dispatchTasksChanged(payload));
  socket.on('task:updated', (payload) => dispatchTasksChanged(payload));

  // Comment events → forward and allow components to lift updates if desired
  socket.on('comment:created', (payload) => forward('comments:changed', payload));
  socket.on('comment:deleted', (payload) => forward('comments:changed', payload));
  socket.on('comment:reply_created', (payload) => forward('comments:changed', payload));
  socket.on('comment:reaction', (payload) => forward('comments:changed', payload));

  // Presence
  socket.on('presence:update', (payload) => forward('presence:update', payload));

  // Connection diagnostics
  socket.on('connect', () => forward('socket:connect', { id: socket?.id }));
  socket.on('disconnect', (reason) => forward('socket:disconnect', { reason }));
  socket.on('connect_error', (err) => forward('socket:error', { message: err?.message }));

  return socket;
}

export function joinProjectRoom(projectId: string | number) {
  const s = getSocket();
  if (!s) return;
  const room = `project:${Number(projectId)}`;
  if (currentRoom === room) return;
  if (currentRoom) {
    try {
      s.emit('room:leave', { projectId: Number(String(currentRoom).split(':')[1]) });
    } catch {}
  }
  currentRoom = room;
  s.emit('room:join', { projectId: Number(projectId) });
}

export function leaveCurrentRoom() {
  const s = getSocket();
  if (!s || !currentRoom) return;
  try {
    s.emit('room:leave', { projectId: Number(String(currentRoom).split(':')[1]) });
  } catch {}
  currentRoom = null;
}
