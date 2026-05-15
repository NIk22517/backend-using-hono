import { Server, Socket } from "socket.io";
import { verify } from "jsonwebtoken";
import { Environment } from "@/core/utils/EnvValidator";
import { ServerType } from "@hono/node-server";
import type { UserType } from "@/types/hono";
import { ChatMessageType, MessageDeleteAction } from "@/db/chatSchema";
import { CallType } from "../db/callSchema";
import { services } from "@/core/di/container";

export type ServerToClientEvents = {
  sendMessage: (
    message: ChatMessageType & { reply_data: ChatMessageType | null },
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
    caller_name: string;
  }) => void;
  "call:accepted": (data: { call_id: number; by: number }) => void;
  "call:rejected": (data: { call_id: number; rejected_by: number }) => void;
  "call:ended": (data: { call_id: number; ended_by: number }) => void;
  "call:missed": (data: { call_id: number; missed_by: number }) => void;
  "call:cancelled": (data: { call_id: number; cancelled_by: number }) => void;
  "call:participant-left": (data: { call_id: number; left_by: number }) => void;
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
      },
    );

    this.io.use(this.authenticateToken);

    this.io.on("connection", (socket) => {
      if (socket.user?.id) {
        this.connectedUsers.set(socket.user.id, socket);
        console.log(`User ${socket.user.id} connected`);
      }

      socket.on("disconnect", () => {
        if (socket.user?.id) {
          this.connectedUsers.delete(socket.user.id);
          console.log(`User ${socket.user.id} disconnected`);
        }
      });

      socket.on("call:join-room", ({ call_id }) => {
        console.log(`User ${socket.user?.id} joining call_${call_id}`);
        socket.join(`call_${call_id}`);

        const usersInRoom = this.getUsersInCallRoom(call_id);
        console.log(`Room call_${call_id} participants:`, usersInRoom);

        this.getIO().to(`call_${call_id}`).emit("call:room-ready", {
          call_id,
          participants: usersInRoom,
        });
      });

      socket.on("call:ready-for-webrtc", ({ call_id }) => {
        console.log(
          `User ${socket.user?.id} ready for WebRTC in call ${call_id}`,
        );
        socket.to(`call_${call_id}`).emit("call:accepted", {
          call_id,
          by: socket.user?.id!,
        });
      });

      socket.on("call:leave", ({ call_id }) => {
        console.log(`User ${socket.user?.id} leaving call_${call_id}`);
        socket.leave(`call_${call_id}`);

        const remainingUsers = this.getUsersInCallRoom(call_id);
        if (remainingUsers.length > 0) {
          this.getIO().to(`call_${call_id}`).emit("call:room-ready", {
            call_id,
            participants: remainingUsers,
          });
        }
      });

      socket.on("webrtc:offer", (payload) => {
        console.log(
          `Relaying offer for call ${payload.call_id} from ${socket.user?.id}`,
        );
        socket.to(`call_${payload.call_id}`).emit("webrtc:offer", payload);
      });

      socket.on("webrtc:answer", (payload) => {
        console.log(
          `Relaying answer for call ${payload.call_id} from ${socket.user?.id}`,
        );
        socket.to(`call_${payload.call_id}`).emit("webrtc:answer", payload);
      });

      socket.on("webrtc:ice-candidate", (payload) => {
        console.log(
          `Relaying ICE for call ${payload.call_id} from ${socket.user?.id}`,
        );
        socket
          .to(`call_${payload.call_id}`)
          .emit("webrtc:ice-candidate", payload);
      });

      socket.on("call:accept", ({ call_id }) => {
        console.log(`User ${socket.user?.id} accepted call ${call_id}`);
        socket.join(`call_${call_id}`);

        const usersInRoom = this.getUsersInCallRoom(call_id);
        this.getIO().to(`call_${call_id}`).emit("call:room-ready", {
          call_id,
          participants: usersInRoom,
        });

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

    if (!token) return next(new Error("No token provided"));

    try {
      const decoded = verify(token, Environment.JWT_SECRET);
      if (typeof decoded !== "object" || !("id" in decoded)) {
        return next(new Error("Invalid token payload"));
      }
      socket.user = decoded as UserType;
      next();
    } catch {
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

  public isOnline(userId: number): boolean {
    return this.connectedUsers.has(userId);
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

  public getUsersInCallRoom(call_id: number): number[] {
    const room = this.getIO().sockets.adapter.rooms.get(`call_${call_id}`);
    const userIds: number[] = [];
    if (room) {
      room.forEach((socketId) => {
        const s = this.getIO().sockets.sockets.get(socketId);
        if (s?.user?.id) userIds.push(s.user.id);
      });
    }
    return userIds;
  }

  public async sendPush({
    user_id,
    payload,
  }: {
    user_id: number;
    payload: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    };
  }) {
    const userSocket = this.connectedUsers.get(user_id);
    if (userSocket) return;
    await services.notificationServices.sendNotification({
      user_id,
      payload,
    });
  }
}

export default SocketService;
