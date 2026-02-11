import cloudinary from "@/config/cloudinary";
import { eventEmitter } from "@/core/events/eventEmitter";
import { db } from "@/db";
import {
  broadcastRecipients,
  chatMembers,
  chatMessageAttachments,
  chatMessageReadReceipts,
  chatMessages,
  chatMessageDeletes,
  chatMessagesReply,
  chatMessageSystemEvents,
  chatPins,
  chatReadSummary,
  chats,
  chatScheduleMessages,
  ChatTypeEnum,
  MessageDeleteAction,
  MessageTypeEnum,
  SystemEventType,
  chatClearStates,
} from "@/db/chatSchema";
import { usersTable } from "@/db/userSchema";
import { socketService } from "@/index";
import { UploadApiResponse } from "cloudinary";
import {
  and,
  desc,
  eq,
  inArray,
  sql,
  ne,
  isNull,
  lte,
  isNotNull,
  or,
  gte,
  gt,
  lt,
  asc,
} from "drizzle-orm";
import { encodeBase64 } from "hono/utils/encode";
import { PinType } from "./ChatController";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { AppError } from "@/core/errors";
import { DbExecutor } from "@/types/db";
import {
  InternalChatMessageRequest,
  ChatMessagesResponse,
  ChatMessage,
  PagingInfo,
} from "./chat.schemas";
import {
  scheduledMessageQueue,
  ScheduledMessageQueue,
} from "@/core/queue/queues/ScheduledMessageQueue";
import { queueManager } from "@/core/queue/QueueManager";

export type SendMessagePayload = {
  chat_id: string;
  message: string;
  files: File[] | null;
  sender_id: number;
  reply_message_id?: string;
  message_type?: MessageTypeEnum;
  event?: SystemEventType;
  metadata?: {
    target_user_ids?: number[];
  };
  reuseAttachments?: UploadApiResponse[] | null;
};

const searchCursorSchema = z.object({
  created_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Invalid created_at",
  }),
  rank: z.number().finite(),
  id: z.number().int().positive(),
});

type SearchCursor = z.infer<typeof searchCursorSchema>;

export class ChatServices {
  async generateGroupName(
    memberIds: number[],
    previewCount = 3,
  ): Promise<string> {
    const users = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(inArray(usersTable.id, memberIds))
      .limit(previewCount + 1);

    const shown = users.slice(0, previewCount).map((u) => u.name);
    const remaining = memberIds.length - shown.length;

    if (remaining > 0) {
      return `${shown.join(", ")} +${remaining} more`;
    }

    return shown.join(", ");
  }
  async createChat({
    member_ids,
    creator_id,
    type,
    name,
  }: {
    creator_id: number;
    member_ids: number[];
    name?: string;
    type: ChatTypeEnum;
  }) {
    return db.transaction(async (tx) => {
      if (type === "single") {
        if (member_ids.length !== 1) {
          throw new Error("Single chat requires exactly one user");
        }
        const otherUserId = member_ids[0];
        const [existing] = await tx
          .select({ chat_id: chats.id })
          .from(chats)
          .innerJoin(chatMembers, eq(chatMembers.chat_id, chats.id))
          .where(eq(chats.chat_type, "single"))
          .groupBy(chats.id).having(sql`
          COUNT(*) = 2 AND
          BOOL_AND(${chatMembers.user_id} IN (${creator_id}, ${otherUserId}))
        `);
        if (existing) {
          return { newChat: { id: existing.chat_id } };
        }

        const [newChat] = await tx
          .insert(chats)
          .values({
            chat_type: type,
            created_by: creator_id,
          })
          .returning();

        await tx.insert(chatMembers).values([
          { chat_id: newChat.id, user_id: creator_id },
          { chat_id: newChat.id, user_id: otherUserId },
        ]);
        return { newChat };
      }

      if (type === "group") {
        if (member_ids.length < 2) {
          throw new Error("Group chat requires at least 2 users");
        }
        const finalName =
          name ?? (await this.generateGroupName([...member_ids, creator_id]));

        const [newChat] = await tx
          .insert(chats)
          .values({
            chat_type: type,
            created_by: creator_id,
            name: finalName,
          })
          .returning();
        await tx.insert(chatMembers).values(
          [creator_id, ...member_ids].map((id) => ({
            chat_id: newChat.id,
            user_id: id,
          })),
        );

        await this.insertSingleMessage(
          {
            chat_id: newChat.id.toString(),
            sender_id: creator_id,
            message_type: "system",
            event: "group_created",
            message: "",
            files: [],
            metadata: {
              target_user_ids: member_ids,
            },
          },
          {
            tx,
          },
        );
        return { newChat };
      }
      if (type === "broadcast") {
        if (member_ids.length < 1) {
          throw new Error("Broadcast requires at least one recipient");
        }
        const finalName = name ?? (await this.generateGroupName(member_ids));
        const [newChat] = await tx
          .insert(chats)
          .values({
            chat_type: type,
            created_by: creator_id,
            name: finalName,
          })
          .returning();

        await tx.insert(chatMembers).values({
          chat_id: newChat.id,
          user_id: creator_id,
        });
        await tx.insert(broadcastRecipients).values(
          member_ids.map((id) => ({
            chat_id: newChat.id,
            recipient_id: id,
          })),
        );
        return { newChat };
      }
      throw new Error("Invalid chat type");
    });
  }

  async getAllChats({
    id,
    limit = 10,
    offset = 0,
  }: {
    id: number;
    limit?: number;
    offset?: number;
  }) {
    const chatIdsResults = await db
      .select({ chat_id: chatMembers.chat_id })
      .from(chatMembers)
      .where(eq(chatMembers.user_id, id))
      .limit(limit)
      .offset(offset);

    const chatIds = chatIdsResults.map((row) => row.chat_id);

    if (chatIds.length === 0) return [];

    const results = await db
      .select({
        chat_id: chats.id,
        chat_name: chats.name,
        chat_type: chats.chat_type,
        created_at: chats.created_at,
        members: sql<{ id: number; name: string; email: string }[]>`
          json_agg(
            json_build_object(
              'id', users.id,
              'name', users.name,
              'email', users.email
            )
          ) FILTER (WHERE users.id != ${id})
        `.as("members"),
        last_message: sql`
  (
    SELECT 
      CASE 
        WHEN cmd.message_id IS NOT NULL THEN NULL
        ELSE json_build_object(
          'message',
            CASE
              WHEN cmd.message_id IS NOT NULL THEN 'This message is deleted'
              ELSE cm.message
            END,
          'attachments',
            CASE
              WHEN cmd.message_id IS NOT NULL THEN '[]'::json
              ELSE  cma.attachments::json
            END,
          'created_at', cm.created_at,
          'message_id', cm.id
        )
      END
    FROM chat_messages cm
    LEFT JOIN chat_message_attachments cma
      ON cm.id = cma.message_id AND cm.chat_id = cma.chat_id
    LEFT JOIN chat_message_deletes cmd
      ON cmd.message_id = cm.id AND cmd.user_id = ${id}
    WHERE cm.chat_id = chats.id
    ORDER BY cm.created_at DESC
    LIMIT 1
  )
`.as("last_message"),
        unread_count: sql<number>`
            COALESCE(${chatReadSummary.unread_count}, 0)
        `.as("unread_count"),
        is_pinned: sql<boolean>`bool_or(chat_pins.id IS NOT NULL)`.as(
          "is_pinned",
        ),
      })
      .from(chats)
      .innerJoin(chatMembers, eq(chats.id, chatMembers.chat_id))
      .innerJoin(sql`users`, eq(chatMembers.user_id, sql`users.id`))
      .leftJoin(
        chatPins,
        and(eq(chatPins.chat_id, chats.id), eq(chatPins.pinned_by, id)),
      )
      .leftJoin(
        chatReadSummary,
        and(
          eq(chatReadSummary.chat_id, chats.id),
          eq(chatReadSummary.user_id, id),
        ),
      )
      .where(inArray(chats.id, chatIds))
      .groupBy(
        chats.id,
        chats.name,
        chats.chat_type,
        chats.created_at,
        chatPins.pinned_at,
        chatReadSummary.unread_count,
      )
      .orderBy(
        sql`CASE WHEN ${chatPins.pinned_at} IS NOT NULL THEN 1 ELSE 0 END DESC`,
        desc(chats.updated_at),
      )
      .limit(limit)
      .offset(offset);

    return results;
  }

  async getConversationalContacts({ user_id }: { user_id: number }) {
    const cm1 = alias(chatMembers, "cm1");
    const cm2 = alias(chatMembers, "cm2");
    const results = await db
      .selectDistinct({
        id: usersTable.id,
        name: usersTable.name,
      })
      .from(cm1)
      .innerJoin(cm2, eq(cm1.chat_id, cm2.chat_id))
      .innerJoin(usersTable, eq(usersTable.id, cm2.user_id))
      .where(and(eq(cm1.user_id, user_id), ne(cm2.user_id, user_id)));

    return results;
  }

  async uploadFiles({
    files,
    folder_name,
  }: {
    files: File[] | null;
    folder_name: string;
  }) {
    if (!files || !Array.isArray(files)) return [];
    const results: UploadApiResponse[] = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const base64 = encodeBase64(buffer);
      const uploadFile = await cloudinary.uploader.upload(
        `data:${file.type};base64,${base64}`,
        {
          folder: folder_name,
          access_mode: "authenticated",
          filename_override: file.name,
          resource_type: "auto",
        },
      );

      const { folder, access_mode, api_key, ...rest } = uploadFile;
      results.push(rest as UploadApiResponse);
    }
    return results;
  }

  async insertSingleMessage(
    {
      chat_id,
      files,
      message,
      sender_id,
      event,
      message_type,
      metadata,
      reply_message_id,
      reuseAttachments = null,
    }: SendMessagePayload,
    { tx = db }: { tx?: DbExecutor } = {},
  ) {
    let uploadFiles: UploadApiResponse[] = [];
    if (files && files?.length > 0 && !reuseAttachments) {
      uploadFiles = await this.uploadFiles({
        files,
        folder_name: `chat_messages_${chat_id}`,
      });
    } else if (reuseAttachments && reuseAttachments.length > 0) {
      uploadFiles = reuseAttachments;
    }

    const [newMessage] = await tx
      .insert(chatMessages)
      .values({
        chat_id: Number(chat_id),
        message,
        sender_id,
        message_type,
      })
      .returning();

    if (uploadFiles.length > 0) {
      await tx.insert(chatMessageAttachments).values({
        added_by: sender_id,
        chat_id: Number(chat_id),
        message_id: newMessage.id,
        attachments: uploadFiles,
      });
    }

    let reply_data = null;

    if (reply_message_id) {
      const reply_id = Number(reply_message_id);
      const [reply] = await tx
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, reply_id));

      reply_data = reply;

      await tx.insert(chatMessagesReply).values({
        chat_id: Number(chat_id),
        message_id: newMessage.id,
        reply_message_id: reply_id,
      });
    }

    if (message_type === "system" && event) {
      await tx.insert(chatMessageSystemEvents).values({
        chat_id: Number(chat_id),
        event,
        message_id: newMessage.id,
        metadata: {
          actor_id: sender_id,
          ...metadata,
        },
      });
    }

    const returnData = {
      ...newMessage,
      attachments: uploadFiles,
      reply_data: reply_data ? { ...reply_data } : reply_data,
    };

    eventEmitter.emit("messageSent", {
      message: returnData,
      sender_id: sender_id,
    });

    return returnData;
  }

  async sendMessage(data: SendMessagePayload) {
    const [checkType] = await db
      .select()
      .from(chats)
      .where(eq(chats.id, Number(data.chat_id)));
    if (!checkType) throw new Error("Chat not found");

    const message = await this.insertSingleMessage({ ...data });
    if (checkType.chat_type === "broadcast") {
      const broadcast_recipients = await db
        .select()
        .from(broadcastRecipients)
        .where(eq(broadcastRecipients.chat_id, checkType.id));

      for (const { recipient_id } of broadcast_recipients) {
        const fonudChat = await this.createChat({
          creator_id: data.sender_id,
          member_ids: [recipient_id],
          type: "single",
        });
        if ("id" in fonudChat?.newChat) {
          const childMessage = await this.insertSingleMessage({
            ...data,
            chat_id: fonudChat.newChat.id?.toString(),
            files: [],
            reuseAttachments: message.attachments,
          });
          await db
            .update(chatMessages)
            .set({ parent_message_id: message.id })
            .where(eq(chatMessages.id, childMessage.id));
        }
      }
    }

    return message;
  }

  async getChatMessages({
    chat_id,
    user_id,
    limit = 10,
    after_id,
    before_id,
    around_id,
    equal_id,
    chat_type,
  }: InternalChatMessageRequest & {
    equal_id?: number;
  }): Promise<ChatMessagesResponse> {
    if (around_id) {
      const target = await this.getChatMessages({
        chat_id,
        limit: 1,
        user_id,
        equal_id: around_id,
        chat_type,
      });
      const older = await this.getChatMessages({
        chat_id,
        user_id,
        limit: Math.floor(limit / 2),
        before_id: around_id,
        chat_type,
      });

      const newer = await this.getChatMessages({
        chat_id,
        user_id,
        limit: Math.ceil(limit / 2),
        after_id: around_id,
        chat_type,
      });

      const combined = [...newer.data, ...target.data, ...older.data];

      return {
        data: combined,
        paging: {
          has_older: older.paging.has_older,
          has_newer: newer.paging.has_newer,
          oldest_id: combined[combined.length - 1]?.id ?? null,
          newest_id: combined[0]?.id ?? null,
          limit,
        },
      };
    }

    let cursorCondition;
    let orderDirection;

    if (before_id) {
      cursorCondition = lt(chatMessages.id, before_id);
      orderDirection = desc(chatMessages.id);
    } else if (after_id) {
      cursorCondition = gt(chatMessages.id, after_id);
      orderDirection = asc(chatMessages.id);
    } else if (equal_id) {
      cursorCondition = eq(chatMessages.id, equal_id);
      orderDirection = desc(chatMessages.id);
    } else {
      orderDirection = desc(chatMessages.id);
    }

    const messages = await db
      .select({
        id: chatMessages.id,
        chat_id: chatMessages.chat_id,
        message_type: chatMessages.message_type,
        message: sql<string | null>`
            CASE
              WHEN ${chatMessageDeletes.message_id} IS NOT NULL  
              THEN NULL
              ELSE ${chatMessages.message}
              END
        `.as("message"),
        attachments: sql<UploadApiResponse[] | null>`
            CASE
            WHEN ${chatMessageDeletes.message_id} is NOT NULL
            THEN NULL
            ELSE ${chatMessageAttachments.attachments}
            END
        `.as("attachments"),
        sender_id: chatMessages.sender_id,
        created_at: chatMessages.created_at,
        sender_name: usersTable.name,
        reply_message_id: chatMessagesReply.reply_message_id,
        delete_action: chatMessageDeletes.delete_action,
        delete_text: sql<string | null>`
            CASE ${chatMessageDeletes.delete_action}
              WHEN 'self' THEN 'You deleted this message'
              WHEN 'everyone' THEN
                CASE 
                WHEN ${chatMessages.sender_id} = ${user_id}
                THEN 'You deleted this message for everyone'
                ELSE 'This message was deleted'
                END
              ELSE NULL
            END
        `.as("delete_text"),
      })
      .from(chatMessages)
      .leftJoin(
        chatMessageDeletes,
        and(
          eq(chatMessageDeletes.message_id, chatMessages.id),
          eq(chatMessageDeletes.user_id, user_id),
        ),
      )
      .leftJoin(
        chatMessageAttachments,
        eq(chatMessageAttachments.message_id, chatMessages.id),
      )
      .leftJoin(usersTable, eq(usersTable.id, chatMessages.sender_id))
      .leftJoin(
        chatMessagesReply,
        and(
          eq(chatMessagesReply.chat_id, chatMessages.chat_id),
          eq(chatMessagesReply.message_id, chatMessages.id),
        ),
      )
      .leftJoin(
        chatClearStates,
        and(
          eq(chatClearStates.chat_id, chatMessages.chat_id),
          eq(chatClearStates.user_id, user_id),
        ),
      )
      .where(
        and(
          eq(chatMessages.chat_id, chat_id),
          or(
            isNull(chatClearStates.cleared_at),
            gt(chatMessages.created_at, chatClearStates.cleared_at),
          ),
          cursorCondition,
        ),
      )
      .orderBy(orderDirection)
      .limit(limit + 1);

    if (!messages?.length)
      return {
        data: [],
        paging: {
          has_older: false,
          has_newer: false,
          oldest_id: null,
          newest_id: null,
          limit: 0,
        },
      };

    const hasExtra = messages.length > limit;

    const sliced = hasExtra ? messages.slice(0, limit) : messages;

    const normalizedMessages = after_id ? sliced.reverse() : sliced;

    const replyIds = [
      ...new Set(
        normalizedMessages
          .map((m) => m.reply_message_id)
          .filter((id): id is number => !!id),
      ),
    ];

    const replyMessages = replyIds.length
      ? await db
          .select({
            id: chatMessages.id,
            message: chatMessages.message,
            attachments: chatMessageAttachments.attachments,
            sender_id: chatMessages.sender_id,
            created_at: chatMessages.created_at,
            sender_name: usersTable.name,
          })
          .from(chatMessages)
          .leftJoin(
            chatMessageAttachments,
            eq(chatMessageAttachments.message_id, chatMessages.id),
          )
          .leftJoin(usersTable, eq(usersTable.id, chatMessages.sender_id))
          .where(
            and(
              inArray(chatMessages.id, replyIds),
              eq(chatMessages.chat_id, chat_id),
            ),
          )
      : [];

    const replyMap = new Map<number, (typeof replyMessages)[number]>();
    for (const r of replyMessages) {
      replyMap.set(r.id, r);
    }

    const recipients =
      chat_type === "broadcast"
        ? await db
            .select({
              user_id: broadcastRecipients.recipient_id,
              name: usersTable.name,
            })
            .from(broadcastRecipients)
            .leftJoin(
              usersTable,
              eq(usersTable.id, broadcastRecipients.recipient_id),
            )
            .where(eq(broadcastRecipients.chat_id, chat_id))
        : await db
            .select({ user_id: chatMembers.user_id, name: usersTable.name })
            .from(chatMembers)
            .leftJoin(usersTable, eq(usersTable.id, chatMembers.user_id))
            .where(eq(chatMembers.chat_id, chat_id));

    const memberMap = new Map(recipients.map((r) => [r.user_id, r.name]));

    const systemMessageIds = normalizedMessages
      .filter((m) => m.message_type === "system")
      .map((m) => m.id);

    const systemRows = systemMessageIds.length
      ? await db
          .select()
          .from(chatMessageSystemEvents)
          .where(
            and(
              inArray(chatMessageSystemEvents.message_id, systemMessageIds),
              eq(chatMessageSystemEvents.chat_id, chat_id),
            ),
          )
      : [];

    const systemMap = new Map<
      number,
      {
        event: string;
        actor: { user_id: number; name: string };
        targets?: { user_id: number; name: string }[];
      }
    >();

    for (const system of systemRows) {
      const { message_id, event, metadata } = system;
      if (!event || !metadata) continue;

      systemMap.set(message_id, {
        event,
        actor: {
          user_id: metadata.actor_id,
          name: memberMap.get(metadata.actor_id) ?? "Unknown",
        },
        targets: metadata.target_user_ids?.map((uid) => ({
          user_id: uid,
          name: memberMap.get(uid) ?? "Unknown",
        })),
      });
    }

    const messageIds = normalizedMessages.map((m) => m.id);
    const readMap = new Map<number, Set<number>>();

    if (chat_type !== "broadcast") {
      const rows = await db
        .select({
          message_id: chatMessageReadReceipts.message_id,
          user_id: chatMessageReadReceipts.user_id,
        })
        .from(chatMessageReadReceipts)
        .where(
          and(
            eq(chatMessageReadReceipts.chat_id, chat_id),
            inArray(chatMessageReadReceipts.message_id, messageIds),
          ),
        );

      for (const r of rows) {
        if (!readMap.has(r.message_id)) {
          readMap.set(r.message_id, new Set());
        }
        readMap.get(r.message_id)!.add(r.user_id);
      }
    } else {
      const rows = await db
        .select({
          parent_message_id: chatMessages.parent_message_id,
          child_message_id: chatMessages.id,
          user_id: chatMessageReadReceipts.user_id,
        })
        .from(chatMessages)
        .leftJoin(
          chatMessageReadReceipts,
          eq(chatMessageReadReceipts.message_id, chatMessages.id),
        )
        .where(
          and(
            isNotNull(chatMessages.parent_message_id),
            inArray(chatMessages.parent_message_id, messageIds),
          ),
        );

      for (const r of rows) {
        if (!r.parent_message_id) continue;

        if (!readMap.has(r.parent_message_id)) {
          readMap.set(r.parent_message_id, new Set());
        }

        if (r.user_id) {
          readMap.get(r.parent_message_id)!.add(r.user_id);
        }
      }
    }

    const results: ChatMessage[] = normalizedMessages.map((msg) => {
      const readers = readMap.get(msg.id) ?? new Set<number>();

      const eligibleRecipients = [...memberMap.keys()].filter(
        (uid) => uid !== msg.sender_id,
      );

      const read_by = eligibleRecipients.filter((uid) => readers.has(uid));
      const unread_by = eligibleRecipients.filter((uid) => !readers.has(uid));

      return {
        ...msg,
        reply_data: msg.reply_message_id
          ? ((replyMap.get(
              msg.reply_message_id,
            ) as ChatMessage["reply_data"]) ?? null)
          : null,
        system_data:
          msg.message_type === "system"
            ? ((systemMap.get(msg.id) as ChatMessage["system_data"]) ?? null)
            : null,
        read_by: read_by.map((id) => memberMap.get(id)!),
        unread_by: unread_by.map((id) => memberMap.get(id)!),
        read_status: unread_by.length === 0 ? "read" : "unread",
        seen_all: unread_by.length === 0,
      };
    });

    const newestId = results[0]?.id ?? null;
    const oldestId = results[results.length - 1]?.id ?? null;

    const paging: PagingInfo = {
      has_older: before_id ? hasExtra : !after_id && hasExtra,
      has_newer: after_id ? hasExtra : false,
      oldest_id: oldestId,
      newest_id: newestId,
      limit,
    };

    return {
      data: results,
      paging,
    };
  }

  async markAsReadMsg({
    chat_id,
    user_id,
  }: {
    chat_id: number;
    user_id: number;
  }) {
    const [lastMessage] = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.chat_id, chat_id),
          ne(chatMessages.message_type, "system"),
        ),
      )
      .orderBy(desc(chatMessages.created_at))
      .limit(1);

    if (!lastMessage) return null;
    const last_read_message_id = lastMessage.id;

    const unreadMessages = await db
      .select({
        message_id: chatMessages.id,
        chat_id: chatMessages.chat_id,
      })
      .from(chatMessages)
      .leftJoin(
        chatMessageReadReceipts,
        and(
          eq(chatMessageReadReceipts.chat_id, chatMessages.chat_id),
          eq(chatMessageReadReceipts.message_id, chatMessages.id),
          eq(chatMessageReadReceipts.user_id, user_id),
        ),
      )
      .where(
        and(
          eq(chatMessages.chat_id, chat_id),
          ne(chatMessages.message_type, "system"),
          ne(chatMessages.sender_id, user_id),
          isNull(chatMessageReadReceipts.id),
          lte(chatMessages.id, last_read_message_id),
        ),
      );

    if (unreadMessages.length > 0) {
      await db
        .insert(chatMessageReadReceipts)
        .values(
          unreadMessages.map((el) => ({
            chat_id: el.chat_id,
            message_id: el.message_id,
            user_id,
          })),
        )
        .onConflictDoNothing();
    }

    const [receipt] = await db
      .insert(chatReadSummary)
      .values({
        chat_id,
        user_id,
        last_read_message_id,
        unread_count: 0,
        last_read_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [chatReadSummary.chat_id, chatReadSummary.user_id],
        set: {
          last_read_message_id,
          unread_count: 0,
          last_read_at: new Date(),
          updated_at: new Date(),
        },
      })
      .returning();

    const members = await db
      .select()
      .from(chatMembers)
      .where(eq(chatMembers.chat_id, chat_id));

    members?.forEach((el) => {
      socketService.sendToUser({
        event: "markReadMessage",
        userId: el.user_id,
        args: [{ chat_id, seen_by: user_id }],
      });
    });

    return receipt;
  }

  async deleteMessages({
    message_ids,
    action,
    user_id,
    chat_id,
  }: {
    message_ids?: number[];
    action: MessageDeleteAction | "clear_chat";
    user_id: number;
    chat_id: number;
  }) {
    const [chat_data] = await db
      .select()
      .from(chats)
      .where(eq(chats.id, chat_id));

    if (!chat_data) {
      throw new Error("Chat not found");
    }

    switch (action) {
      case "self": {
        if (!message_ids || message_ids.length === 0) {
          throw new Error("message_ids is required");
        }

        if (chat_data.chat_type === "broadcast") {
          const allChildMessages = await db
            .select({
              message_id: chatMessages.id,
              chat_id: chatMessages.chat_id,
              parent_message_id: chatMessages.parent_message_id,
            })
            .from(chatMessages)
            .where(
              and(
                inArray(chatMessages.parent_message_id, message_ids),
                eq(chatMessages.sender_id, user_id),
              ),
            );

          const deleteValues = allChildMessages.map((el) => {
            return {
              message_id: el.message_id,
              user_id,
              delete_action: action,
              chat_id: el.chat_id,
              deleted_by: user_id,
            };
          });

          await db
            .insert(chatMessageDeletes)
            .values(deleteValues)
            .onConflictDoUpdate({
              target: [
                chatMessageDeletes.message_id,
                chatMessageDeletes.user_id,
              ],
              set: {
                delete_action: action,
                deleted_at: new Date(),
              },
            })
            .returning();

          deleteValues.forEach((el) => {
            socketService.sendToUser({
              userId: el.user_id,
              event: "deleteMessage",
              args: [
                {
                  action,
                  chat_id: el.chat_id,
                  deleted_by: user_id,
                  messages_ids: [el.message_id],
                },
              ],
            });
          });
        }

        const values = message_ids.map((id) => ({
          message_id: id,
          user_id,
          delete_action: action,
          chat_id,
          deleted_by: user_id,
        }));

        const data = await db
          .insert(chatMessageDeletes)
          .values(values)
          .onConflictDoUpdate({
            target: [chatMessageDeletes.message_id, chatMessageDeletes.user_id],
            set: {
              delete_action: action,
              deleted_at: new Date(),
            },
          })
          .returning();

        socketService.sendToUser({
          event: "deleteMessage",
          userId: user_id,
          args: [
            {
              action,
              chat_id,
              deleted_by: user_id,
              messages_ids: message_ids,
            },
          ],
        });

        return data;
      }
      case "everyone": {
        if (!message_ids || message_ids.length === 0) {
          throw new Error("message_ids is required");
        }

        if (chat_data.chat_type === "broadcast") {
          const childMessages = await db
            .select({
              message_id: chatMessages.id,
              chat_id: chatMessages.chat_id,
            })
            .from(chatMessages)
            .where(inArray(chatMessages.parent_message_id, message_ids));

          if (!childMessages.length) return [];

          const members = await db
            .select({
              chat_id: chatMembers.chat_id,
              user_id: chatMembers.user_id,
            })
            .from(chatMembers)
            .where(
              and(
                inArray(
                  chatMembers.chat_id,
                  childMessages.map((m) => m.chat_id),
                ),
                ne(chatMembers.user_id, user_id),
              ),
            );

          const recipientByChat = new Map<number, number>();

          for (const m of members) {
            if (m.user_id !== user_id) {
              recipientByChat.set(m.chat_id, m.user_id);
            }
          }

          const deleteValues = childMessages.flatMap((msg) => {
            const recipientId = recipientByChat.get(msg.chat_id);

            if (!recipientId) {
              throw new Error(`Recipient not found for chat ${msg.chat_id}`);
            }

            return [
              {
                message_id: msg.message_id,
                chat_id: msg.chat_id,
                user_id: recipientId,
                delete_action: action,
                deleted_by: user_id,
              },
              {
                message_id: msg.message_id,
                chat_id: msg.chat_id,
                user_id: user_id,
                delete_action: action,
                deleted_by: user_id,
              },
            ];
          });

          await db
            .insert(chatMessageDeletes)
            .values(deleteValues)
            .onConflictDoUpdate({
              target: [
                chatMessageDeletes.message_id,
                chatMessageDeletes.user_id,
              ],
              set: {
                delete_action: action,
                deleted_at: new Date(),
              },
            })
            .returning();

          deleteValues.forEach((el) => {
            socketService.sendToUser({
              userId: el.user_id,
              event: "deleteMessage",
              args: [
                {
                  action,
                  chat_id: el.chat_id,
                  deleted_by: user_id,
                  messages_ids: [el.message_id],
                },
              ],
            });
          });
        }

        const members = await db
          .select({ user_id: chatMembers.user_id })
          .from(chatMembers)
          .where(eq(chatMembers.chat_id, chat_id));

        if (members.length === 0) {
          throw new Error("No members found in the chat");
        }

        const values = message_ids.flatMap((message_id) =>
          members.map((member) => ({
            message_id,
            user_id: member.user_id,
            chat_id,
            delete_action: action,
            deleted_by: user_id,
          })),
        );

        const data = await db
          .insert(chatMessageDeletes)
          .values(values)
          .onConflictDoUpdate({
            target: [chatMessageDeletes.message_id, chatMessageDeletes.user_id],
            set: {
              delete_action: action,
              deleted_at: new Date(),
            },
          })
          .returning();

        members.forEach((el) => {
          socketService.sendToUser({
            userId: el.user_id,
            event: "deleteMessage",
            args: [
              {
                action,
                chat_id,
                deleted_by: user_id,
                messages_ids: message_ids,
              },
            ],
          });
        });
        return data;
      }
      case "clear_chat": {
        const data = await db
          .insert(chatClearStates)
          .values({
            chat_id,
            user_id,
            cleared_at: new Date(),
          })
          .onConflictDoUpdate({
            target: [chatClearStates.chat_id, chatClearStates.user_id],
            set: {
              chat_id,
              user_id,
              cleared_at: new Date(),
            },
          })
          .returning();

        socketService.sendToUser({
          userId: user_id,
          event: "deleteMessage",
          args: [
            {
              action: "clear_chat",
              chat_id: chat_id,
              deleted_by: user_id,
              messages_ids: [],
            },
          ],
        });
        return data;
      }
      default:
        throw new Error("Unsupported delete action");
    }
  }

  async getSingleChatList({ chat_id }: { chat_id: number }) {
    const [result] = await db
      .select({
        chat_id: chats.id,
        chat_name: chats.name,
        chat_type: chats.chat_type,
        created_at: chats.created_at,
        members: sql<{ id: number; name: string; email: string }[]>`
            CASE
              WHEN ${chats.chat_type} = 'broadcast' THEN (
                SELECT json_agg(
                  json_build_object(
                    'id', u1.id,
                    'name', u1.name,
                    'email', u1.email
                  )
                )
                FROM ${broadcastRecipients} br
                INNER JOIN ${usersTable} u1 on u1.id = br.recipient_id
                WHERE br.chat_id = ${chats}.id
              )
              ELSE (
                SELECT json_agg(
                  json_build_object(
                    'id', u2.id,
                    'name', u2.name,
                    'email', u2.email
                  )
                )
                FROM ${chatMembers} cm
                INNER JOIN ${usersTable} u2 on u2.id = cm.user_id
                WHERE cm.chat_id = ${chats}.id
              )
              END
        `.as("members"),
      })
      .from(chats)
      .where(eq(chats.id, chat_id));

    if (!result) {
      throw AppError.notFound("No Chat Room Found");
    }

    return result;
  }

  async pinUnpinChat({ chat_id, pinned, pinned_by }: PinType) {
    if (pinned) {
      const [result] = await db
        .insert(chatPins)
        .values({
          chat_id,
          pinned_by,
        })
        .returning();

      return result;
    }
    const [result] = await db
      .delete(chatPins)
      .where(
        and(eq(chatPins.chat_id, chat_id), eq(chatPins.pinned_by, pinned_by)),
      )
      .returning();

    return result;
  }

  async scheduleMessage({
    chat_id,
    message,
    sender_id,
    scheduled_at,
  }: {
    chat_id: number;
    message: string;
    sender_id: number;
    scheduled_at: Date;
  }) {
    const [result] = await db
      .insert(chatScheduleMessages)
      .values({
        chat_id,
        sender_id,
        message,
        scheduled_at,
        timezone: "Asia/Kolkata",
      })
      .returning();

    await scheduledMessageQueue.scheduleMessage(
      {
        chatId: result.chat_id,
        message: result.message ?? "",
        scheduleId: result.id,
        senderId: result.sender_id,
      },
      result.scheduled_at,
    );

    return result;
  }

  async getScheduleMessages({
    user_id,
    chat_id,
  }: {
    user_id: number;
    chat_id: number;
  }) {
    const result = await db
      .select({
        id: chatScheduleMessages.id,
        chat_id: chatScheduleMessages.chat_id,
        user_id: chatScheduleMessages.sender_id,
        message: chatScheduleMessages.message,
        scheduled_at: chatScheduleMessages.scheduled_at,
        status: chatScheduleMessages.status,
        retry_count: chatScheduleMessages.retry_count,
        last_attempt_at: chatScheduleMessages.last_attempt_at,
        completed_at: chatScheduleMessages.completed_at,
        created_at: chatScheduleMessages.created_at,
      })
      .from(chatScheduleMessages)
      .where(
        and(
          eq(chatScheduleMessages.sender_id, user_id),
          eq(chatScheduleMessages.chat_id, chat_id),
        ),
      )
      .orderBy(desc(chatScheduleMessages.scheduled_at));

    return result;
  }

  async deleteScheduleMessage({
    user_id,
    schedule_id,
  }: {
    user_id: number;
    schedule_id: number;
  }) {
    const result = await db
      .delete(chatScheduleMessages)
      .where(
        and(
          eq(chatScheduleMessages.sender_id, user_id),
          eq(chatScheduleMessages.id, schedule_id),
        ),
      )
      .returning();
    await scheduledMessageQueue.removeSchedule(schedule_id);
    return result;
  }

  async updateScheduleMessages({
    user_id,
    schedule_id,
    message,
    scheduled_at,
  }: {
    user_id: number;
    schedule_id: number;
    message?: string;
    scheduled_at?: Date;
  }) {
    const updateFields: Partial<typeof chatScheduleMessages.$inferInsert> = {};

    if (message !== undefined) {
      updateFields.message = message;
    }

    if (scheduled_at !== undefined) {
      updateFields.scheduled_at = scheduled_at;
    }

    if (Object.keys(updateFields).length === 0) {
      throw new Error("No fields to update");
    }

    const [result] = await db
      .update(chatScheduleMessages)
      .set(updateFields)
      .where(
        and(
          eq(chatScheduleMessages.sender_id, user_id),
          eq(chatScheduleMessages.id, schedule_id),
          eq(chatScheduleMessages.active, true),
        ),
      )
      .returning();

    scheduledMessageQueue.updateSchedule({
      chatId: result.chat_id,
      message: result.message ?? "",
      scheduledAt: result.scheduled_at,
      scheduleId: result.id,
      senderId: result.sender_id,
    });

    return result;
  }

  async checkStatus({
    chat_id,
    user_id,
    message_id,
    chat_type,
  }: {
    chat_id: number;
    user_id: number;
    message_id: number;
    chat_type: ChatTypeEnum;
  }) {
    if (chat_type === "broadcast") {
      const childMessages = await db
        .select({ id: chatMessages.id })
        .from(chatMessages)
        .where(eq(chatMessages.parent_message_id, message_id));

      if (!childMessages.length) return { statuses: [] };

      const childIds = childMessages.map((m) => m.id);

      const receipts = await db
        .select({
          message_id: chatMessageReadReceipts.message_id,
          user_id: chatMessageReadReceipts.user_id,
        })
        .from(chatMessageReadReceipts)
        .where(inArray(chatMessageReadReceipts.message_id, childIds));

      const recipients = await db
        .select({
          user_id: broadcastRecipients.recipient_id,
        })
        .from(broadcastRecipients)
        .where(eq(broadcastRecipients.chat_id, chat_id));

      const receiptMap = new Map<number, Set<number>>();
      for (const r of receipts) {
        if (!receiptMap.has(r.user_id)) receiptMap.set(r.user_id, new Set());
        receiptMap.get(r.user_id)!.add(r.message_id);
      }

      const statuses = recipients.map((r) => {
        const readChildIds = receiptMap.get(r.user_id) ?? new Set();
        return {
          user_id: r.user_id,
          status: readChildIds.size ? "read" : "delivered",
        };
      });

      return { statuses };
    } else {
      const receipt = await db
        .select({
          message_id: chatMessageReadReceipts.message_id,
          user_id: chatMessageReadReceipts.user_id,
        })
        .from(chatMessageReadReceipts)
        .where(
          and(
            eq(chatMessageReadReceipts.message_id, message_id),
            eq(chatMessageReadReceipts.chat_id, chat_id),
          ),
        );

      const receiptMap = new Set<number>();

      for (const r of receipt) {
        const { user_id } = r;
        receiptMap.add(user_id);
      }

      const recipients = await db
        .select({
          user_id: chatMembers.user_id,
        })
        .from(chatMembers)
        .where(
          and(
            eq(chatMembers.chat_id, chat_id),
            ne(chatMembers.user_id, user_id),
          ),
        );

      const statuses = recipients.map((el) => {
        const hasRead = receiptMap.has(el.user_id);
        return { user_id: el.user_id, status: hasRead ? "read" : "delivered" };
      });
      return { statuses };
    }
  }

  encodeCursor(cursor: SearchCursor) {
    return Buffer.from(JSON.stringify(cursor)).toString("base64");
  }

  decodeCursor(cursor: string): SearchCursor {
    let parsed: unknown;

    try {
      parsed = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
    } catch {
      throw new Error("Invalid cursor encoding");
    }

    const result = searchCursorSchema.safeParse(parsed);

    if (!result.success) {
      throw new Error("Invalid cursor format");
    }

    return result.data;
  }

  async searchMessages({
    user_id,
    chat_id,
    search_text,
    limit = 10,
    cursor,
  }: {
    user_id: number;
    chat_id: number;
    search_text: string;
    limit?: number;
    cursor?: string;
  }) {
    const tsQuery = sql`
        websearch_to_tsquery('english', ${search_text})
    `;

    let cursorCondition = undefined;

    if (cursor) {
      const { created_at, rank, id } = this.decodeCursor(cursor);

      cursorCondition = sql`
    (
      ${chatMessages.created_at} < ${created_at}
      OR (
        ${chatMessages.created_at} = ${created_at}
        AND ts_rank_cd(${chatMessages.search_vector}, ${tsQuery}, 32) < ${rank}
      )
      OR (
        ${chatMessages.created_at} = ${created_at}
        AND ts_rank_cd(${chatMessages.search_vector}, ${tsQuery}, 32) = ${rank}
        AND ${chatMessages.id} < ${id}
      )
    )
  `;
    }

    const results = await db
      .select({
        id: chatMessages.id,
        message: chatMessages.message,
        created_at: chatMessages.created_at,
        highlighted_message: sql<string>`
        ts_headline(
          'english',
          ${chatMessages.message},
         ${tsQuery},
          'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25, ShortWord=3, HighlightAll=FALSE'
        )
      `.as("highlighted_message"),
        rank: sql<number>`
        ts_rank_cd(
          ${chatMessages.search_vector},
          ${tsQuery},
          32 
        )
      `.as("rank"),
      })
      .from(chatMessages)
      .leftJoin(
        chatMessageDeletes,
        and(
          eq(chatMessageDeletes.message_id, chatMessages.id),
          eq(chatMessageDeletes.user_id, user_id),
        ),
      )
      .leftJoin(
        chatClearStates,
        and(
          eq(chatClearStates.chat_id, chatMessages.chat_id),
          eq(chatClearStates.user_id, user_id),
        ),
      )
      .where(
        and(
          eq(chatMessages.chat_id, chat_id),
          eq(chatMessages.message_type, "user"),
          isNull(chatMessageDeletes.message_id),
          or(
            isNull(chatClearStates.cleared_at),
            gt(chatMessages.created_at, chatClearStates.cleared_at),
          ),
          sql`${chatMessages.search_vector} @@ ${tsQuery}`,
          cursorCondition,
        ),
      )
      .orderBy(
        desc(chatMessages.created_at),
        desc(sql`rank`),
        desc(chatMessages.id),
      )
      .limit(limit + 1);
    let nextCursor: string | null = null;
    if (results.length > limit) {
      const last = results[limit - 1];

      nextCursor = this.encodeCursor({
        created_at: last.created_at?.toISOString() as string,
        rank: last.rank,
        id: last.id,
      });
      results.pop();
    }
    return {
      data: results,
      nextCursor,
    };
  }
}
