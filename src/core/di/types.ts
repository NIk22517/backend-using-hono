import { AuthService } from "@/features/auth";
import { ChatServices } from "@/features/chat";
import { UserServices } from "@/features/user";

export interface Services {
  authService: AuthService;
  userServices: UserServices;
  chatServices: ChatServices;
}
