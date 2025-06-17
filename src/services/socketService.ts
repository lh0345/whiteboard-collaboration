
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  username: string;
  color: string;
  isCreator?: boolean;
}

interface DrawingEvent {
  type: 'path' | 'clear' | 'erase';
  data: any;
  userId: string;
  username: string;
  timestamp: Date;
  color: string;
}

class SocketService {
  private socket: Socket | null = null;
  private serverUrl = 'http://localhost:3001';

  connect() {
    this.socket = io(this.serverUrl);
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Room management
  createRoom(roomId: string, password: string, username: string) {
    this.socket?.emit('create-room', { roomId, password, username });
  }

  joinRoom(roomId: string, password: string, username: string, creatorToken?: string) {
    this.socket?.emit('join-room', { roomId, password, username, creatorToken });
  }

  terminateRoom(creatorToken: string) {
    this.socket?.emit('terminate-room', { creatorToken });
  }

  // Drawing events
  sendDrawingEvent(drawingEvent: Omit<DrawingEvent, 'userId' | 'username' | 'timestamp'>) {
    this.socket?.emit('drawing-event', drawingEvent);
  }

  clearBoard() {
    this.socket?.emit('clear-board');
  }

  // Event listeners
  onRoomCreated(callback: (data: any) => void) {
    this.socket?.on('room-created', callback);
  }

  onRoomJoined(callback: (data: any) => void) {
    this.socket?.on('room-joined', callback);
  }

  onRoomError(callback: (error: any) => void) {
    this.socket?.on('room-error', callback);
  }

  onUserJoined(callback: (user: User) => void) {
    this.socket?.on('user-joined', callback);
  }

  onUserLeft(callback: (user: User) => void) {
    this.socket?.on('user-left', callback);
  }

  onUsersUpdated(callback: (users: User[]) => void) {
    this.socket?.on('users-updated', callback);
  }

  onDrawingEvent(callback: (event: DrawingEvent) => void) {
    this.socket?.on('drawing-event', callback);
  }

  onBoardCleared(callback: (data: any) => void) {
    this.socket?.on('board-cleared', callback);
  }

  onRoomTerminated(callback: (data: any) => void) {
    this.socket?.on('room-terminated', callback);
  }

  // Connection events
  onConnect(callback: () => void) {
    this.socket?.on('connect', callback);
  }

  onDisconnect(callback: () => void) {
    this.socket?.on('disconnect', callback);
  }
}

export const socketService = new SocketService();
export type { User, DrawingEvent };
