import { AiService } from "@/features/ai/AiService";
import { AuthService } from "@/features/auth/AuthService";
import { ChatServices } from "@/features/chat/ChatServices";
import { UserServices } from "@/features/user/UserServices";

export const services = {
  authService: new AuthService(),
  userServices: new UserServices(),
  chatServices: new ChatServices(),
  AiServices: new AiService(),
};
