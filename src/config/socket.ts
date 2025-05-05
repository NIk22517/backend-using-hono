import { Server, Socket } from "socket.io";
import { verify } from "jsonwebtoken";
import { JWT_SECRET } from "@/core/utils/EnvValidator";
import { ServerType } from "@hono/node-server/.";
import { UserType } from "@/types/hono";
import { ChatMessageType } from "@/db/chatSchema";

interface DecodedToken {
  userId: string;
  role: string;
}

export type ServerToClientEvents = {
  sendMessage: (
    message: ChatMessageType & { reply_data: ChatMessageType | null }
  ) => void;
};

declare module "socket.io" {
  interface Socket {
    user?: UserType;
  }
}

class SocketService {
  private io: Server<ServerToClientEvents> | null = null;
  private readonly connectedUsers = new Map<number, Socket>();

  constructor(private readonly server: ServerType) {
    this.init();
  }

  private init() {
    if (!this.io) {
      this.io = new Server<ServerToClientEvents>(this.server, {
        cors: { origin: "*" }, // Adjust CORS as needed
      });

      // Use a middleware to check the JWT token for each connection
      this.io.use(this.authenticateToken);

      this.io.on("connection", (socket: Socket<ServerToClientEvents>) => {
        if (socket.user?.id) {
          this.connectedUsers.set(socket.user.id, socket);
          console.log(`User ${socket.user.id} connected`);
          console.log(this.connectedUsers.keys(), "connectedUsers");
        }
        socket.on("disconnect", () => {
          if (socket.user?.id) {
            this.connectedUsers.delete(socket.user.id);
            console.log(`User ${socket.user.id} disconnected`);
            console.log([...this.connectedUsers.keys()], "connectedUsers");
          }
        });
      });
    }
  }

  private authenticateToken(socket: Socket, next: (err?: Error) => void) {
    const token = socket.handshake.auth.token
      ? socket.handshake.auth.token
      : socket.handshake.headers.token;

    if (!token) {
      return next(new Error("No token provided"));
    }

    const decoded = verify(token, JWT_SECRET);
    if (typeof decoded !== "object" || !("id" in decoded)) {
      return next(new Error("Invalid token payload"));
    }
    const payload = decoded as UserType;

    socket.user = payload;
    next();
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
}

export default SocketService;
