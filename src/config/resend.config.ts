import { Environment } from "@/core/utils/EnvValidator";
import { Resend } from "resend";

export interface ResendConfigOptions {
  apiKey: string;
  from: {
    default: string;
    support: string;
    noreply: string;
  };
  app: {
    name: string;
    url: string;
    logoUrl: string;
  };
  limits?: {
    dailyEmailLimit?: number;
    batchSize?: number;
  };
}

export const resendConfig: ResendConfigOptions = {
  apiKey: Environment.RESEND_API_KEY,

  from: {
    default: "Acme <onboarding@resend.dev>",
    support: "Acme <onboarding@resend.dev>",
    noreply: "Acme <onboarding@resend.dev>",
  },

  app: {
    name: "Chat App",
    url: "http://localhost:3001",
    logoUrl: "",
  },

  limits: {
    dailyEmailLimit: 100,
    batchSize: 100,
  },
};

export const resend = new Resend(resendConfig.apiKey);
