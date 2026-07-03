import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export class SocketService {
  private io: Server;
  // Map of userId to array of socketIds (to support multiple devices)
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.handleConnections();
  }

  private setupMiddleware() {
    this.io.use((socket, next) => {
      try {
        let token = socket.handshake.auth?.token;
        if (!token && socket.handshake.headers.cookie) {
          const cookies = socket.handshake.headers.cookie.split(';').map(c => c.trim());
          const jwtCookie = cookies.find(c => c.startsWith('jwt='));
          if (jwtCookie) {
            token = jwtCookie.split('=')[1];
          }
        }
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
        socket.data.userId = decoded.id;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });
  }

  private handleConnections() {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Join a personal room
      socket.join(userId);

      // Broadcast online status to everyone
      this.io.emit('userOnline', { userId });

      socket.on('disconnect', () => {
        const userSocketIds = this.userSockets.get(userId);
        if (userSocketIds) {
          userSocketIds.delete(socket.id);
          if (userSocketIds.size === 0) {
            this.userSockets.delete(userId);
            this.io.emit('userOffline', { userId });
          }
        }
      });

      // Client-driven realtime typing indicators
      socket.on('typing', ({ conversationId, receiverId }) => {
        this.emitToUser(receiverId, 'typing', { conversationId, userId });
      });

      socket.on('stopTyping', ({ conversationId, receiverId }) => {
        this.emitToUser(receiverId, 'stopTyping', { conversationId, userId });
      });

      // Pass-through for delivery receipts
      socket.on('messageDelivered', ({ messageId, conversationId, senderId }) => {
        this.emitToUser(senderId, 'messageDelivered', { messageId, conversationId, userId });
      });

      // Pass-through for seen receipts if done via socket instead of API
      socket.on('messageSeen', ({ messageId, conversationId, senderId }) => {
        this.emitToUser(senderId, 'messageSeen', { messageId, conversationId, userId });
      });

      socket.on('getOnlineUsers', () => {
        const onlineUsers = Array.from(this.userSockets.keys());
        socket.emit('onlineUsers', onlineUsers);
      });
    });
  }

  // Abstraction for sending real-time updates
  public emitToUser(userId: string, event: string, payload: any) {
    this.io.to(userId).emit(event, payload);
  }

  public emitToConversation(conversationId: string, event: string, payload: any) {
    this.io.to(`conversation_${conversationId}`).emit(event, payload);
  }
}

// Singleton pattern for the service
let socketServiceInstance: SocketService | null = null;

export const initSocketService = (server: HttpServer) => {
  socketServiceInstance = new SocketService(server);
  return socketServiceInstance;
};

export const getSocketService = () => {
  return socketServiceInstance;
};
