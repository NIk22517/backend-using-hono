import cloudinary from "@/config/cloudinary";
import { eventEmitter } from "@/core/events/eventEmitter";
import { db } from "@/db";
import {
  chatMembers,
  chatMessageAttachments,
  chatMessages,
  chatMessagesDeletes,
  chatMessagesReply,
  chatReadReceipts,
  chats,
  DeleteAction,
} from "@/db/chatSchema";
import { usersTable } from "@/db/userSchema";
import { socketService } from "@/index";
import { UploadApiResponse } from "cloudinary";
import { and, desc, eq, inArray, sql, ne, isNull, or } from "drizzle-orm";
import { encodeBase64 } from "hono/utils/encode";

export class ChatServices {
  async createSingleChat({
    name,
    user_id,
  }: {
    user_id: number[];
    name?: string;
  }) {
    if (user_id.length === 2) {
      const [existing] = await db
        .select({
          chat_id: chatMembers.chat_id,
        })
        .from(chatMembers)
        .leftJoin(chats, eq(chatMembers.chat_id, chats.id))
        .where(
          and(
            inArray(chatMembers.user_id, user_id),
            eq(chats.chat_type, "single")
          )
        )
        .groupBy(chatMembers.chat_id)
        .having(sql`COUNT(DISTINCT ${chatMembers.user_id}) = 2`);

      if (existing) {
        return {
          ...existing,
        };
      }

      const [newChat] = await db
        .insert(chats)
        .values({
          chat_type: "single",
          created_by: user_id[user_id.length - 1],
          name,
        })
        .returning();

      await db.insert(chatMembers).values(
        user_id.map((id) => ({
          chat_id: newChat.id,
          user_id: id,
        }))
      );

      return { newChat };
    } else if (user_id.length > 2) {
      const [newChat] = await db
        .insert(chats)
        .values({
          chat_type: "group",
          created_by: user_id[user_id.length - 1],
          name,
        })
        .returning();

      await db.insert(chatMembers).values(
        user_id.map((id) => ({
          chat_id: newChat.id,
          user_id: id,
        }))
      );

      return { newChat };
    }
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
      .where(eq(chatMembers.user_id, id));

    const chatIds = chatIdsResults.map((row) => row.chat_id);

    if (chatIds.length === 0) return [];

    const results = await db
      .select({
        chat_id: chats.id,
        chat_name: chats.name,
        chat_type: chats.chat_type,
        created_at: chats.created_at,
        members: sql`
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
        WHEN cmd.message_id IS NOT NULL AND cmd.delete_action = 'clear_all_chat' THEN NULL
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
          'created_at', cm.created_at
        )
      END
    FROM chat_messages cm
    LEFT JOIN chat_message_attachments cma
      ON cm.id = cma.message_id AND cm.chat_id = cma.chat_id
    LEFT JOIN chat_messages_delete cmd
      ON cmd.message_id = cm.id AND cmd.user_id = ${id}
    WHERE cm.chat_id = chats.id
    ORDER BY cm.created_at DESC
    LIMIT 1
  )
`.as("last_message"),
        unread_count: sql`
       (
         SELECT COUNT(*)
         FROM chat_read_receipts crr
         WHERE crr.chat_id = chats.id AND crr.user_id = ${id} AND crr.status = 'unread'
       )
     `.as("unread_count"),
      })
      .from(chats)
      .innerJoin(chatMembers, eq(chats.id, chatMembers.chat_id))
      .innerJoin(sql`users`, eq(chatMembers.user_id, sql`users.id`))
      .where(inArray(chats.id, chatIds))
      .groupBy(chats.id, chats.name, chats.chat_type, chats.created_at)
      .orderBy(desc(chats.updated_at))
      .limit(limit)
      .offset(offset);

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
        }
      );

      const { folder, access_mode, api_key, ...rest } = uploadFile;
      results.push(rest as UploadApiResponse);
    }
    return results;
  }

  async sendMessage({
    chat_id,
    files,
    message,
    sender_id,
    reply_message_id,
  }: {
    chat_id: string;
    message: string;
    files: File[] | null;
    sender_id: number;
    reply_message_id?: string;
  }) {
    const uploadFiles = await this.uploadFiles({
      files,
      folder_name: `chat_messages_${chat_id}`,
    });

    const [newMessage] = await db
      .insert(chatMessages)
      .values({
        chat_id: Number(chat_id),
        message,
        sender_id,
      })
      .returning();

    if (uploadFiles.length > 0) {
      await db.insert(chatMessageAttachments).values({
        added_by: sender_id,
        chat_id: Number(chat_id),
        message_id: newMessage.id,
        attachments: uploadFiles,
      });
    }

    let reply_data = null;

    if (reply_message_id) {
      const reply_id = Number(reply_message_id);
      const [reply] = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, reply_id));

      reply_data = reply;

      await db.insert(chatMessagesReply).values({
        chat_id: Number(chat_id),
        message_id: newMessage.id,
        reply_message_id: reply_id,
      });
    }

    eventEmitter.emit("messageSent", {
      message: {
        ...newMessage,
        attachments: uploadFiles,
        reply_data: reply_data ? { ...reply_data } : reply_data,
      },
      sender_id,
    });

    return {
      ...newMessage,
      attachments: uploadFiles,
      reply_data: reply_data ? { ...reply_data } : reply_data,
    };
  }

  async getChatMessages({
    chat_id,
    user_id,
    limit = 10,
    offset = 0,
  }: {
    chat_id: string;
    user_id: number;
    offset?: number;
    limit?: number;
  }) {
    const results = await db
      .select({
        chat_id: chatMessages.chat_id,
        id: chatMessages.id,
        message: chatMessages.message,
        attachments: chatMessageAttachments.attachments,
        sender_id: chatMessages.sender_id,
        created_at: chatMessages.created_at,
        read_status: sql`
         (SELECT 
            CASE
                WHEN EXISTS (
                  SELECT 1
                  FROM chat_read_receipts crr
                  WHERE crr.message_id = ${chatMessages.id}
                  AND crr.user_id != ${user_id}
                  AND crr.status != 'read'
                )
                THEN 'unread'
                ELSE 'read'
                END
         )
        `.as("read_status"),
        sender_name: sql`
          (SELECT name FROM users WHERE id = ${user_id})
        `.as("sender_name"),
        delete_action: chatMessagesDeletes.delete_action,
        delete_text: sql`
        CASE ${chatMessagesDeletes.delete_action}
    WHEN 'delete_for_me' THEN 'You deleted this message'
    WHEN 'delete_for_everyone' THEN 
      CASE 
        WHEN ${chatMessages.sender_id} = ${user_id} THEN 'You deleted this message for everyone'
        ELSE 'This message was deleted by the sender'
      END
    WHEN 'clear_all_chat' THEN 'You cleared the chat'
    WHEN 'permanently_delete' THEN 'Message permanently deleted'
    ELSE NULL
  END
`.as("delete_text"),
        reply_data: sql`
        (SELECT json_build_object(
          'id', cm.id,
          'message', cm.message,
          'attachments', cma.attachments,
          'sender_id', cm.sender_id,
          'created_at', cm.created_at,
          'sender_name', (SELECT name FROM users WHERE id = cm.sender_id)
        )
        FROM chat_messages cm
        LEFT JOIN chat_message_attachments cma
          ON cm.id = cma.message_id AND cm.chat_id = cm.chat_id
        WHERE cm.id = ${chatMessagesReply.reply_message_id})`.as("reply_data"),
      })
      .from(chatMessages)
      .leftJoin(
        chatMessagesDeletes,
        and(
          eq(chatMessages.id, chatMessagesDeletes.message_id),
          eq(chatMessagesDeletes.user_id, user_id)
        )
      )
      .leftJoin(
        chatMessagesReply,
        eq(chatMessages.id, chatMessagesReply.message_id)
      )
      .leftJoin(
        chatMessageAttachments,
        and(
          eq(chatMessages.id, chatMessageAttachments.message_id),
          eq(chatMessages.chat_id, chatMessageAttachments.chat_id)
        )
      )
      .where(
        and(
          eq(chatMessages.chat_id, Number(chat_id)),
          or(
            isNull(chatMessagesDeletes.delete_action),
            ne(chatMessagesDeletes.delete_action, "clear_all_chat")
          )
        )
      )
      .orderBy(desc(chatMessages.created_at))
      .limit(limit)
      .offset(offset);

    return results;
  }

  async markAsReadMsg({
    chat_id,
    user_id,
  }: {
    chat_id: number;
    user_id: number;
  }) {
    const { rowCount } = await db
      .update(chatReadReceipts)
      .set({ status: "read" })
      .where(
        and(
          eq(chatReadReceipts.chat_id, chat_id),
          eq(chatReadReceipts.user_id, user_id),
          eq(chatReadReceipts.status, "unread")
        )
      );

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

    return rowCount;
  }

  async deleteMessages({
    message_ids,
    action,
    user_id,
    chat_id,
  }: {
    message_ids?: number[];
    action: DeleteAction;
    user_id: number;
    chat_id: number;
  }) {
    switch (action) {
      case "delete_for_me":
      case "permanently_delete": {
        if (!message_ids || message_ids.length === 0) {
          throw new Error("message_ids is required");
        }
        const values = message_ids.map((id) => ({
          message_id: id,
          user_id,
          delete_action: action as DeleteAction,
          chat_id,
          deleted_by: user_id,
        }));

        const data = await db
          .insert(chatMessagesDeletes)
          .values(values)
          .onConflictDoUpdate({
            target: [
              chatMessagesDeletes.message_id,
              chatMessagesDeletes.user_id,
            ],
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
      case "delete_for_everyone": {
        if (!message_ids || message_ids.length === 0) {
          throw new Error("message_ids is required");
        }

        const members = await db
          .select()
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
            delete_action: "delete_for_everyone" as DeleteAction,
            deleted_by: user_id,
          }))
        );

        const data = await db
          .insert(chatMessagesDeletes)
          .values(values)
          .onConflictDoUpdate({
            target: [
              chatMessagesDeletes.message_id,
              chatMessagesDeletes.user_id,
            ],
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
      case "clear_all_chat": {
        const allMessages = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.chat_id, chat_id));

        const values = allMessages.map((message) => ({
          message_id: message.id,
          user_id,
          delete_action: action as DeleteAction,
          chat_id,
          deleted_by: user_id,
        }));

        const data = await db
          .insert(chatMessagesDeletes)
          .values(values)
          .onConflictDoUpdate({
            target: [
              chatMessagesDeletes.message_id,
              chatMessagesDeletes.user_id,
            ],
            set: {
              delete_action: action,
              deleted_at: new Date(),
            },
          })
          .returning();
        db.update(chats)
          .set({
            updated_at: new Date("2024-10-13"),
          })
          .where(eq(chats.id, chat_id));
        socketService.sendToUser({
          event: "deleteMessage",
          userId: user_id,
          args: [
            {
              action: "clear_all_chat",
              chat_id,
              deleted_by: user_id,
              messages_ids: [],
            },
          ],
        });
        return data;
      }

      case "recover": {
        if (!message_ids || message_ids.length === 0) {
          throw new Error("message_ids is required");
        }

        const data = await db
          .delete(chatMessagesDeletes)
          .where(
            and(
              eq(chatMessagesDeletes.user_id, user_id),
              inArray(chatMessagesDeletes.message_id, message_ids)
            )
          )
          .returning();
        return data;
      }
      case "recover_all_chat": {
        const data = await db
          .delete(chatMessagesDeletes)
          .where(
            and(
              eq(chatMessagesDeletes.user_id, user_id),
              eq(chatMessagesDeletes.chat_id, chat_id)
            )
          )
          .returning();
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
        members: sql`
        json_agg(
          json_build_object(
            'id', users.id,
            'name', users.name,
            'email', users.email
          )
        )`.as("members"),
      })
      .from(chats)
      .innerJoin(chatMembers, eq(chats.id, chatMembers.chat_id))
      .innerJoin(usersTable, eq(chatMembers.user_id, usersTable.id))
      .where(eq(chats.id, chat_id))
      .groupBy(chats.id);

    return result;
  }
}
