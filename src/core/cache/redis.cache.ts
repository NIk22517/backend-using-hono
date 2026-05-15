import { redisClient } from "@/config/redis.client";
import { db } from "@/db";
import {
  broadcastRecipients,
  chatMembers,
  chats,
  ChatTypeEnum,
} from "@/db/chatSchema";
import { usersTable } from "@/db/userSchema";
import { eq } from "drizzle-orm";

export interface CacheTTLConfig {
  readonly CHAT_INFO: number;
  readonly MESSAGE_SUGGESTION: number;
}

export const CACHE_TTL: CacheTTLConfig = {
  CHAT_INFO: 7200, // 2 hours
  MESSAGE_SUGGESTION: 7200,
} as const;

export interface CacheKeyGenerators {
  chatInfo: (chat_id: number) => `chat:info:${number}`;
  suggestionMessage: (data: {
    chat_id: number;
    message_id: number;
  }) => `suggestion:chat:${number}:message:${number}`;
  userInfo: (user_id: number) => `user:info:${number}`;
}

export const getCacheKey: CacheKeyGenerators = {
  chatInfo: (chat_id: number): `chat:info:${number}` => `chat:info:${chat_id}`,
  suggestionMessage: (data: {
    chat_id: number;
    message_id: number;
  }): `suggestion:chat:${number}:message:${number}` =>
    `suggestion:chat:${data.chat_id}:message:${data.message_id}`,
  userInfo: (user_id: number) => `user:info:${user_id}`,
} as const;

export interface CachedChatInfo {
  chat_id: number;
  chat_type: ChatTypeEnum;
  created_by: number;
  members: Set<number>;
}

export interface CachedUserInfo {
  user_id: number;
  user_name: string;
}

class RedisCache {
  private client = redisClient.getClient();

  async getOrSetMapUser(user_id: number): Promise<CachedUserInfo | null> {
    const key = getCacheKey.userInfo(user_id);

    const cached = await this.client.hGetAll(key);
    if (cached && Object.keys(cached).length > 0) {
      return {
        user_id: Number(cached.user_id),
        user_name: cached.user_name,
      };
    }

    //not cache
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user_id));

    const payload: CachedUserInfo = {
      user_id: user.id,
      user_name: user.name,
    };
    await this.client.hSet(key, {
      user_id: user.id.toString(),
      user_name: user.name,
    });
    return payload;
  }

  async getOrSetMapChat(chat_id: number): Promise<CachedChatInfo | null> {
    const key = getCacheKey.chatInfo(chat_id);

    const cached = await this.client.hGetAll(key);
    if (cached && Object.keys(cached).length > 0) {
      return {
        chat_id: Number(cached.chat_id),
        chat_type: cached.chat_type as ChatTypeEnum,
        members: cached.members
          ? new Set(JSON.parse(cached.members))
          : new Set(),
        created_by: Number(cached.created_by),
      };
    }

    const [chat] = await db.select().from(chats).where(eq(chats.id, chat_id));
    if (!chat) return null;

    let members: number[] = [];

    if (chat.chat_type === "broadcast") {
      const mems = await db
        .select({ user_id: broadcastRecipients.recipient_id })
        .from(broadcastRecipients)
        .where(eq(broadcastRecipients.chat_id, chat.id));
      members = mems.map((m) => m.user_id);
    } else {
      const mems = await db
        .select({ user_id: chatMembers.user_id })
        .from(chatMembers)
        .where(eq(chatMembers.chat_id, chat.id));
      members = mems.map((m) => m.user_id);
    }

    const dataToCache: Record<string, string> = {
      chat_id: chat.id.toString(),
      chat_type: chat.chat_type,
      members: JSON.stringify(members),
      created_by: chat.created_by.toString(),
    };

    await this.client.hSet(key, dataToCache);
    await this.client.expire(key, CACHE_TTL.CHAT_INFO);

    return {
      chat_id: chat.id,
      chat_type: chat.chat_type,
      members: new Set(members),
      created_by: chat.created_by,
    };
  }

  async getSuggestionMessage({
    chat_id,
    message_id,
  }: {
    chat_id: number;
    message_id: number;
  }): Promise<string[] | null> {
    const key = getCacheKey.suggestionMessage({ chat_id, message_id });
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setSuggestionMessage({
    chat_id,
    message_id,
    suggestions,
  }: {
    chat_id: number;
    message_id: number;
    suggestions: string[];
  }): Promise<void> {
    const key = getCacheKey.suggestionMessage({ chat_id, message_id });
    await this.client.set(key, JSON.stringify(suggestions), {
      EX: CACHE_TTL.MESSAGE_SUGGESTION,
    });
  }
}

export const redisCache = new RedisCache();
