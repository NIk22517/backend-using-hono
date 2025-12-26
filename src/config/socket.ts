import { Server, Socket } from "socket.io";
import { verify } from "jsonwebtoken";
import { JWT_SECRET } from "@/core/utils/EnvValidator";
import { ServerType } from "@hono/node-server/.";
import { UserType } from "@/types/hono";
import { ChatMessageType, MessageDeleteAction } from "@/db/chatSchema";
import { CallType } from "../db/callSchema";

// ==== Types ====

export type ServerToClientEvents = {
  sendMessage: (
    message: ChatMessageType & { reply_data: ChatMessageType | null }
  ) => void;
  markReadMessage: (value: { chat_id: number; seen_by: number }) => void;
  deleteMessage: (value: {
    chat_id: number;
    action: MessageDeleteAction | "clear_chat";
    messages_ids: number[];
    deleted_by: number;
  }) => void;
  "call:incoming": (data: {
    call_id: number;
    caller_id: number;
    call_type: CallType;
  }) => void;
  "call:accepted": (data: { call_id: number; by: number }) => void;
  "call:ended": (data: { call_id: number; ended_by: number }) => void;
  // NEW: Added room readiness confirmation event
  "call:room-ready": (data: {
    call_id: number;
    participants: number[];
  }) => void;
  "webrtc:offer": (data: {
    call_id: number;
    sdp: RTCSessionDescriptionInit;
  }) => void;
  "webrtc:answer": (data: {
    call_id: number;
    sdp: RTCSessionDescriptionInit;
  }) => void;
  "webrtc:ice-candidate": (data: {
    call_id: number;
    candidate: RTCIceCandidateInit;
  }) => void;
};

export type ClientToServerEvents = {
  "call:accept": (payload: { call_id: number }) => void;
  "call:reject": (payload: { call_id: number }) => void;
  "call:end": (payload: { call_id: number }) => void;
  "call:join-room": (payload: { call_id: number }) => void;
  "call:leave": (payload: { call_id: number }) => void;
  // NEW: Added WebRTC readiness signaling event
  "call:ready-for-webrtc": (payload: { call_id: number }) => void;
  "webrtc:offer": (payload: {
    call_id: number;
    sdp: RTCSessionDescriptionInit;
  }) => void;
  "webrtc:answer": (payload: {
    call_id: number;
    sdp: RTCSessionDescriptionInit;
  }) => void;
  "webrtc:ice-candidate": (payload: {
    call_id: number;
    candidate: RTCIceCandidateInit;
  }) => void;
};

declare module "socket.io" {
  interface Socket {
    user?: UserType;
  }
}

// ==== Service ====

class SocketService {
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
  private readonly connectedUsers = new Map<
    number,
    Socket<ClientToServerEvents, ServerToClientEvents>
  >();

  constructor(private readonly server: ServerType) {
    this.init();
  }

  private init() {
    if (this.io) return;

    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(
      this.server,
      {
        cors: { origin: "http://localhost:3001" },
      }
    );

    // Auth middleware
    this.io.use(this.authenticateToken);

    // Connection handling
    this.io.on("connection", (socket) => {
      if (socket.user?.id) {
        this.connectedUsers.set(socket.user.id, socket);
        console.log(`User ${socket.user.id} connected`);
        console.log([...this.connectedUsers.keys()], "connectedUsers");
      }

      socket.on("disconnect", () => {
        if (socket.user?.id) {
          this.connectedUsers.delete(socket.user.id);
          console.log(`User ${socket.user.id} disconnected`);
          console.log([...this.connectedUsers.keys()], "connectedUsers");
        }
      });

      // === UPDATED: Call room management with proper sequencing ===
      socket.on("call:join-room", ({ call_id }) => {
        console.log(
          `User ${socket.user?.id} joining call room: call_${call_id}`
        );
        socket.join(`call_${call_id}`);

        // NEW: Get all users currently in the room after join
        const usersInRoom = this.getUsersInCallRoom(call_id);
        console.log(`Room call_${call_id} now has participants:`, usersInRoom);

        // NEW: Notify all users in the room about the updated participant list
        // This ensures everyone knows who's in the room before WebRTC starts
        this.getIO().to(`call_${call_id}`).emit("call:room-ready", {
          call_id,
          participants: usersInRoom,
        });
      });

      // NEW: WebRTC readiness signaling
      socket.on("call:ready-for-webrtc", ({ call_id }) => {
        console.log(
          `User ${socket.user?.id} is ready for WebRTC in call ${call_id}`
        );
        // Signal to other participants that this user is ready to start WebRTC
        socket.to(`call_${call_id}`).emit("call:accepted", {
          call_id,
          by: socket.user?.id!,
        });
      });

      socket.on("call:leave", ({ call_id }) => {
        console.log(
          `User ${socket.user?.id} leaving call room: call_${call_id}`
        );
        socket.leave(`call_${call_id}`);

        // NEW: Notify remaining participants about updated room state
        const remainingUsers = this.getUsersInCallRoom(call_id);
        this.getIO().to(`call_${call_id}`).emit("call:room-ready", {
          call_id,
          participants: remainingUsers,
        });
      });

      // In your existing SocketService.ts, update the WebRTC event handlers:

      socket.on("webrtc:offer", (payload) => {
        console.log(
          `📡 SERVER: Relaying offer for call ${payload.call_id} from user ${socket.user?.id}`
        );
        console.log("📡 SERVER: Offer SDP type:", payload.sdp?.type);
        socket.to(`call_${payload.call_id}`).emit("webrtc:offer", payload);
      });

      socket.on("webrtc:answer", (payload) => {
        console.log(
          `📡 SERVER: Relaying answer for call ${payload.call_id} from user ${socket.user?.id}`
        );
        console.log("📡 SERVER: Answer SDP type:", payload.sdp?.type);
        socket.to(`call_${payload.call_id}`).emit("webrtc:answer", payload);
      });

      socket.on("webrtc:ice-candidate", (payload) => {
        console.log(
          `📡 SERVER: Relaying ICE candidate for call ${payload.call_id} from user ${socket.user?.id}`
        );
        console.log(
          "📡 SERVER: ICE candidate type:",
          payload.candidate?.candidate?.substring(0, 50)
        );
        socket
          .to(`call_${payload.call_id}`)
          .emit("webrtc:ice-candidate", payload);
      });

      // Also add debug to the call:ready-for-webrtc handler:
      socket.on("call:ready-for-webrtc", ({ call_id }) => {
        console.log(
          `📡 SERVER: User ${socket.user?.id} is ready for WebRTC in call ${call_id}`
        );
        socket.to(`call_${call_id}`).emit("call:accepted", {
          call_id,
          by: socket.user?.id!,
        });
      });

      // === UPDATED: Call control events with proper room management ===
      socket.on("call:accept", ({ call_id }) => {
        console.log(`User ${socket.user?.id} accepted call ${call_id}`);
        socket.join(`call_${call_id}`);

        // Notify about room update first
        const usersInRoom = this.getUsersInCallRoom(call_id);
        this.getIO().to(`call_${call_id}`).emit("call:room-ready", {
          call_id,
          participants: usersInRoom,
        });

        // Then signal acceptance
        socket.to(`call_${call_id}`).emit("call:accepted", {
          call_id,
          by: socket.user?.id!,
        });
      });

      socket.on("call:reject", ({ call_id }) => {
        console.log(`User ${socket.user?.id} rejected call ${call_id}`);
        socket.leave(`call_${call_id}`);
        socket.to(`call_${call_id}`).emit("call:ended", {
          call_id,
          ended_by: socket.user?.id!,
        });
      });

      socket.on("call:end", ({ call_id }) => {
        console.log(`User ${socket.user?.id} ended call ${call_id}`);
        socket.leave(`call_${call_id}`);
        socket.to(`call_${call_id}`).emit("call:ended", {
          call_id,
          ended_by: socket.user?.id!,
        });
      });
    });
  }

  private authenticateToken(socket: Socket, next: (err?: Error) => void) {
    const token = socket.handshake.auth.token ?? socket.handshake.headers.token;

    if (!token) {
      return next(new Error("No token provided"));
    }

    try {
      const decoded = verify(token, JWT_SECRET);
      if (typeof decoded !== "object" || !("id" in decoded)) {
        return next(new Error("Invalid token payload"));
      }

      socket.user = decoded as UserType;
      next();
    } catch (error) {
      return next(new Error("Token verification failed"));
    }
  }

  public getIO() {
    if (!this.io) throw new Error("Socket.IO not initialized");
    return this.io;
  }

  public emitToAll<K extends keyof ServerToClientEvents>(
    event: K,
    ...args: Parameters<ServerToClientEvents[K]>
  ) {
    this.getIO().emit(event, ...args);
  }

  public sendToUser<K extends keyof ServerToClientEvents>(payload: {
    userId: number;
    event: K;
    args: Parameters<ServerToClientEvents[K]>;
  }) {
    const { userId, event, args } = payload;
    const userSocket = this.connectedUsers.get(userId);

    if (userSocket) {
      userSocket.emit(event, ...args);
    } else {
      console.warn(`User ${userId} not connected`);
    }
  }

  // Helper method to get all users in a call room (unchanged)
  public getUsersInCallRoom(call_id: number): number[] {
    const room = this.getIO().sockets.adapter.rooms.get(`call_${call_id}`);
    const userIds: number[] = [];

    if (room) {
      room.forEach((socketId) => {
        const socket = this.getIO().sockets.sockets.get(socketId);
        if (socket?.user?.id) {
          userIds.push(socket.user.id);
        }
      });
    }

    return userIds;
  }
}

export default SocketService;
