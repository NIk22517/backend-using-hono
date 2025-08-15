import { AiService } from "@/features/ai/AiService";
import { AuthService } from "@/features/auth";
import { CallServices } from "@/features/call/CallService";
import { ChatServices } from "@/features/chat";
import { UserServices } from "@/features/user";

export interface Services {
  authService: AuthService;
  userServices: UserServices;
  chatServices: ChatServices;
  AiServices: AiService;
  CallServices: CallServices;
}
