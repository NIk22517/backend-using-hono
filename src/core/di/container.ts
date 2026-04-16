import { AiService } from "@/features/ai/AiService";
import { AuthService } from "@/features/auth/AuthService";
import { CallServices } from "@/features/call/CallService";
import { ChatServices } from "@/features/chat/ChatServices";
import { UserServices } from "@/features/user/UserServices";
import { Services } from "./types";
import { InviteServices } from "@/features/invite/InviteServices";

export const services: Services = {
  authService: new AuthService(),
  userServices: new UserServices(),
  chatServices: new ChatServices(),
  inviteServices: new InviteServices(),
  AiServices: new AiService(),
  CallServices: new CallServices(),
};
