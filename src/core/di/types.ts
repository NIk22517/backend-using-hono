import { AiService } from "@/features/ai/AiService";
import { AuthService } from "@/features/auth";
import { CallServices } from "@/features/call/CallService";
import { ChatServices } from "@/features/chat";
import { InviteServices } from "@/features/invite/InviteServices";
import { UserServices } from "@/features/user";

export interface Services {
  authService: AuthService;
  userServices: UserServices;
  chatServices: ChatServices;
  inviteServices: InviteServices;
  AiServices: AiService;
  CallServices: CallServices;
}
