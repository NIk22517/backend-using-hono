import { AiService } from "@/features/ai/AiService";
import { AuthService } from "@/features/auth/AuthService";
import { CallServices } from "@/features/call/CallService";
import { ChatServices } from "@/features/chat/ChatServices";
import { UserServices } from "@/features/user/UserServices";
import { Services } from "./types";

export const services: Services = {
  authService: new AuthService(),
  userServices: new UserServices(),
  chatServices: new ChatServices(),
  AiServices: new AiService(),
  CallServices: new CallServices(),
};
