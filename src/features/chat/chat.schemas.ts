import {
  createErrorResponseSchema,
  createSuccessResponseSchema,
} from "@/core/http/responseSchemas";
import {
  chatTypeEnum,
  messageDeleteActionEnum,
  chats,
  chatPins,
  chatMembers,
  chatMessages,
  chatMessageAttachments,
  chatMessageReadReceipts,
  chatReadSummary,
  chatMessageDeletes,
  chatClearStates,
  chatScheduleMessages,
} from "@/db/chatSchema";
import { z } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const ChatInsertSchema = createInsertSchema(chats);
export const ChatSelectSchema = createSelectSchema(chats);

export const ChatPinInsertSchema = createInsertSchema(chatPins);
export const ChatPinSelectSchema = createSelectSchema(chatPins);

export const ChatMemberInsertSchema = createInsertSchema(chatMembers);
export const ChatMemberSelectSchema = createSelectSchema(chatMembers);

export const ChatMessageInsertSchema = createInsertSchema(chatMessages);
export const ChatMessageSelectSchema = createSelectSchema(chatMessages);

export const ChatMessageAttachmentInsertSchema = createInsertSchema(
  chatMessageAttachments,
);
export const ChatMessageAttachmentSelectSchema = createSelectSchema(
  chatMessageAttachments,
);

export const ChatMessageReadReceiptInsertSchema = createInsertSchema(
  chatMessageReadReceipts,
);
export const ChatMessageReadReceiptSelectSchema = createSelectSchema(
  chatMessageReadReceipts,
);

export const ChatReadSummaryInsertSchema = createInsertSchema(chatReadSummary);
export const ChatReadSummarySelectSchema = createSelectSchema(chatReadSummary, {
  last_read_at: z.date().transform((d) => d.toISOString()),
  updated_at: z.date().transform((d) => d.toISOString()),
});

export const ChatMessageDeleteInsertSchema =
  createInsertSchema(chatMessageDeletes);
export const ChatMessageDeleteSelectSchema = createSelectSchema(
  chatMessageDeletes,
  {
    deleted_at: z.date().transform((d) => d.toISOString()),
  },
);

export const ChatClearStateInsertSchema = createInsertSchema(chatClearStates);
export const ChatClearStateSelectSchema = createSelectSchema(chatClearStates, {
  cleared_at: z.date().transform((d) => d.toISOString()),
});

export const ChatScheduleMessageInsertSchema =
  createInsertSchema(chatScheduleMessages);
export const ChatScheduleMessageSelectSchema = createSelectSchema(
  chatScheduleMessages,
  {
    scheduled_at: z.date().transform((d) => d.toISOString()),
    last_attempt_at: z
      .date()
      .nullable()
      .transform((d) => d?.toISOString()),
    completed_at: z
      .date()
      .nullable()
      .transform((d) => d?.toISOString()),
    created_at: z.date().transform((d) => d.toISOString()),
  },
);

// ============================================
// COMMON PARAMETER SCHEMAS
// ============================================

export const chatIdParamSchema = z.object({
  chat_id: z.coerce.number().openapi({
    param: { name: "chat_id", in: "path" },
    example: 1,
    description: "Chat Room ID",
  }),
});

export const chatListPaginationQuerySchema = z.object({
  limit: z.coerce.number().optional().openapi({
    example: 10,
    description: "Number of items to return",
  }),
  offset: z.coerce.number().optional().openapi({
    example: 0,
    description: "Number of items to skip",
  }),
});

// ============================================
// CREATE CHAT SCHEMAS
// ============================================

/**
 * Request schema for creating a new chat
 * Extends the base insert schema with validation rules
 */
export const createNewChatSchema = z.object({
  data: z.object({
    user_ids: z
      .array(z.number())
      .min(1)
      .openapi({
        description: "List of user IDs to include in the chat",
        example: [1, 2, 3],
      }),
    name: z.string().optional().openapi({
      description: "Chat name",
      example: "New Group",
    }),
    type: z.enum(chatTypeEnum.enumValues).openapi({
      description: "Type of chat",
      examples: ["group", "single", "broadcast"],
    }),
  }),
});

/**
 * Response schemas for chat creation
 */
const ExistingChatResponse = z.object({
  newChat: ChatSelectSchema.pick({ id: true }),
});

const NewChatCreatedResponse = z.object({
  newChat: ChatSelectSchema.pick({
    id: true,
    name: true,
    chat_type: true,
    created_at: true,
    created_by: true,
    updated_at: true,
  }).extend({
    created_at: z.date().nullable().openapi({
      description: "Timestamp when the chat was created",
      example: "2026-01-22T10:15:30.000Z",
    }),
    updated_at: z.date().nullable().openapi({
      description: "Timestamp when the chat was last updated",
      example: "2026-01-22T10:20:45.000Z",
    }),
  }),
});

export const NewChatReturnData = z
  .union([ExistingChatResponse, NewChatCreatedResponse])
  .openapi("NewChatReturnData");

export const CreateChatSuccessResponseSchema =
  createSuccessResponseSchema(NewChatReturnData);

export const ChatErrorResponseSchema = createErrorResponseSchema(z.string());

// ============================================
// CHAT LIST SCHEMAS
// ============================================

/**
 * Schema for individual chat in the list
 * Combines data from multiple tables
 */
export const ResultChatListSchema = z.object({
  chat_id: z.number().openapi({ example: 9 }),
  chat_name: z.string().openapi({ example: "Frontend Team" }),
  chat_type: z.enum(chatTypeEnum.enumValues).openapi({ example: "group" }),
  created_at: z.date().nullable().openapi({
    description: "Timestamp when the chat was created",
    example: "2026-01-22T10:00:00.000Z",
  }),
  members: z.array(
    z.object({
      id: z.number().openapi({ example: 1 }),
      name: z.string().openapi({ example: "John Doe" }),
      email: z.email().openapi({ example: "john.doe@example.com" }),
    }),
  ),
  last_message: z
    .union([
      z.null(),
      z.object({
        message_id: z.number().openapi({ example: 456 }),
        message: z
          .string()
          .openapi({ example: "Hey, welcome to the group 👋" }),
        attachments: z.array(z.object({})).openapi({
          description:
            "Cloudinary upload response for chat message attachments",
          example: {
            public_id: "chat_messages_9/file_123",
            secure_url:
              "https://res.cloudinary.com/demo/image/upload/v123/file.png",
            resource_type: "image",
            format: "png",
            bytes: 123456,
          },
        }),
        created_at: z.date().nullable().openapi({
          description: "Timestamp when the message was created",
          example: "2026-01-22T10:15:30.000Z",
        }),
      }),
    ])
    .openapi({
      description: "Last message sent in the chat (null if no messages)",
    }),
  unread_count: z.number().openapi({
    example: 3,
    description: "Number of unread messages for the user",
  }),
  is_pinned: z.boolean().openapi({
    example: false,
    description: "Whether the chat is pinned by the user",
  }),
});

export const ChatListSuccessResponseSchema = createSuccessResponseSchema(
  z.array(ResultChatListSchema),
);

/**
 * Single chat details schema
 */
export const SingleChatListSchema = ChatSelectSchema.pick({
  id: true,
  name: true,
  chat_type: true,
  created_at: true,
})
  .extend({
    chat_id: z.number().openapi({
      description: "Unique identifier of the chat",
      example: 9,
    }),
    chat_name: z.string().nullable().openapi({
      description: "Name of the chat (null for single chats)",
      example: "Frontend Team",
    }),
    created_at: z.string().datetime().nullable().openapi({
      description: "Timestamp when the chat was created",
      example: "2026-01-22T10:00:00.000Z",
    }),
    members: z
      .array(
        z.object({
          id: z.number().openapi({
            description: "User ID of the chat member",
            example: 1,
          }),
          name: z.string().openapi({
            description: "Full name of the chat member",
            example: "John Doe",
          }),
          email: z.string().email().openapi({
            description: "Email address of the chat member",
            example: "john.doe@example.com",
          }),
        }),
      )
      .openapi({
        description: "List of users participating in the chat",
      }),
  })
  .omit({ id: true, name: true });

export const ChatSingleListSuccessResponseSchema =
  createSuccessResponseSchema(SingleChatListSchema);

export const ChatCoversationContactsSuccessResponseSchema =
  createSuccessResponseSchema(
    z.array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    ),
  );

// ============================================
// PIN/UNPIN SCHEMAS
// ============================================

export const PinUnpinPayload = z.object({
  data: ChatPinInsertSchema.pick({
    chat_id: true,
  }).extend({
    chat_id: z.string().transform(Number).openapi({
      description: "ID of the chat to pin or unpin",
      example: "12",
    }),
    pinned: z.boolean().openapi({
      description: "Set to true to pin the chat, false to unpin",
      example: true,
    }),
  }),
});

export const ChatPinUnpinSuccessResponseSchema =
  createSuccessResponseSchema(ChatPinSelectSchema);

// ============================================
// MESSAGE SCHEMAS
// ============================================

/**
 * Cloudinary upload response schema
 */
const UploadApiResponseSchema = z.object({
  public_id: z.string(),
  version: z.number(),
  signature: z.string(),
  width: z.number(),
  height: z.number(),
  format: z.string(),
  resource_type: z.enum(["image", "video", "raw", "auto"]),
  created_at: z.string(),
  tags: z.array(z.string()).optional(),
  bytes: z.number(),
  type: z.string(),
  url: z.url(),
  secure_url: z.url(),
  folder: z.string().optional(),
  original_filename: z.string().optional(),
  placeholder: z.boolean().optional(),
});

/**
 * Reply message data schema
 */
const ReplyMessageSchema = ChatMessageSelectSchema.pick({
  id: true,
  chat_id: true,
  sender_id: true,
  message: true,
  message_type: true,
  created_at: true,
  updated_at: true,
  parent_message_id: true,
  search_vector: true,
});

/**
 * Reply data with attachments and sender info
 */
const ReplyDataSchema = z.object({
  id: z.number().int().openapi({
    description: "Reply id",
  }),
  message: z.string().nullable().openapi({
    description: "Reply Messages Id",
  }),
  attachments: z.array(UploadApiResponseSchema).nullable().openapi({
    description: "Attachment data",
  }),
  sender_id: z.number().int().openapi({
    description: "Reply sender id",
  }),
  created_at: z.coerce.date().openapi({
    description: "date when reply is created",
  }),
  sender_name: z.string().nullable().openapi({
    description: "Sender name",
  }),
});

/**
 * System event data schema
 */
const SystemData = z.object({
  event: z.string(),
  actor: z.object({
    user_id: z.number(),
    name: z.string(),
  }),
  targets: z
    .array(
      z.object({
        user_id: z.number(),
        name: z.string(),
      }),
    )
    .optional(),
});

/**
 * Send message response schema
 */
export const SendMessageSchema = ChatMessageSelectSchema.extend({
  attachments: z.array(z.object({})),
  reply_data: ReplyMessageSchema.nullable(),
});

export const ChatSendMessageSuccessSchema =
  createSuccessResponseSchema(SendMessageSchema);

/**
 * Query parameters for fetching messages
 */
export const ChatMessagesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    before_id: z.coerce.number().int().positive().optional(),
    after_id: z.coerce.number().int().positive().optional(),
    around_id: z.coerce.number().int().positive().optional(),
  })
  .refine(
    (v) => [v.before_id, v.after_id, v.around_id].filter(Boolean).length <= 1,
    { message: "Use only one of before_id, after_id or around_id" },
  );

export const ChatMessagesParamsSchema = chatIdParamSchema.extend({
  chat_id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({
      param: { name: "chat_id", in: "path" },
      example: 10,
    }),
});

export const UserAuthSchema = z.object({
  user_id: z.number().int().positive(),
});

export const GetChatMessagesSchema = ChatMessagesParamsSchema.and(
  ChatMessagesQuerySchema,
).and(UserAuthSchema);

/**
 * Complete chat message schema with all fields
 */
export const ChatMessageSchema = ChatMessageSelectSchema.extend({
  attachments: z.array(UploadApiResponseSchema).nullable().openapi({
    description: "List of files or images attached to the message",
  }),
  sender_name: z.string().nullable().openapi({
    description: "Display name of the sender",
    example: "John Doe",
  }),
  reply_message_id: z.number().nullable().openapi({
    description: "ID of the parent message if this is a reply",
  }),
  delete_action: z.enum(["self", "everyone"]).nullable().openapi({
    description: "Indicates if the message was deleted and for whom",
  }),
  delete_text: z.string().nullable().openapi({
    description: "Placeholder text shown when a message is deleted",
    example: "This message was deleted",
  }),
  reply_data: ReplyDataSchema.nullable().openapi({
    description: "Nested data of the message being replied to",
  }),
  system_data: SystemData.nullable().openapi({
    description: "Metadata for system-generated events (joins, leaves, etc.)",
  }),
  read_by: z.array(z.string()).openapi({
    description: "List of user IDs who have seen this message",
    example: ["user_1", "user_2"],
  }),
  unread_by: z.array(z.string()).openapi({
    description:
      "List of user IDs in the chat who haven't seen this message yet",
  }),
  read_status: z.enum(["read", "unread"]).openapi({
    description: "Status of the message relative to the current user",
  }),
  seen_all: z.boolean().openapi({
    description: "True if every participant in the chat has read the message",
  }),
}).omit({ search_vector: true });

/**
 * Pagination info schema
 */
export const PagingInfoSchema = z
  .object({
    has_older: z.boolean().openapi({
      description:
        "Indicates if there are more messages before the current set",
      example: true,
    }),
    has_newer: z.boolean().openapi({
      description: "Indicates if there are more messages after the current set",
      example: false,
    }),
    oldest_id: z.number().nullable().openapi({
      description: "The ID of the oldest message in the current data array",
      example: 501,
    }),
    newest_id: z.number().nullable().openapi({
      description: "The ID of the newest message in the current data array",
      example: 550,
    }),
    limit: z.number().int().openapi({
      description: "The maximum number of items requested",
      example: 20,
    }),
  })
  .openapi("PagingInfo");

export const ChatMessagesResponseSchema = z
  .object({
    data: z.array(ChatMessageSchema).openapi({
      description: "The list of chat messages",
    }),
    paging: PagingInfoSchema.openapi({
      description: "Pagination metadata for fetching the next or previous set",
    }),
  })
  .openapi("ChatMessagesResponse");

export const ChatGetMessagesSuccessSchema = createSuccessResponseSchema(
  ChatMessagesResponseSchema,
);

// ============================================
// SCHEDULE MESSAGE SCHEMAS
// ============================================

export const scheduleSchema = ChatScheduleMessageInsertSchema.pick({
  chat_id: true,
  message: true,
  scheduled_at: true,
}).extend({
  chat_id: z.coerce.number(),
  message: z.string().default(""),
  scheduled_at: z.preprocess((arg) => {
    if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
  }, z.date()),
});

export const ChatScheduleMessagesSuccessSchema = createSuccessResponseSchema(
  ChatScheduleMessageSelectSchema,
);

export const ScheduleMessagesSuccessSchema = createSuccessResponseSchema(
  z.array(ChatScheduleMessageSelectSchema),
);

const GetScheduleSchema = ChatScheduleMessageSelectSchema.pick({
  id: true,
  chat_id: true,
  sender_id: true,
  message: true,
  scheduled_at: true,
  status: true,
  retry_count: true,
  last_attempt_at: true,
  completed_at: true,
  created_at: true,
}).transform(({ sender_id, ...rest }) => ({
  ...rest,
  user_id: sender_id,
}));

export const ChatGetScheduleSuccessSchema = createSuccessResponseSchema(
  z.array(GetScheduleSchema),
);

export const updateScheduleSchema = z.object({
  data: z.object({
    schedule_id: z.string().transform((d) => Number(d)),
    message: z.string().default(""),
    scheduled_at: z
      .preprocess((arg) => {
        if (typeof arg === "string" || arg instanceof Date)
          return new Date(arg);
      }, z.date())
      .optional(),
  }),
});

// ============================================
// READ/DELETE MESSAGE SCHEMAS
// ============================================

export const ChatMarkAsReadSuccessSchema = createSuccessResponseSchema(
  ChatReadSummarySelectSchema,
);

export const DeleteMessageSchema = z.object({
  data: z.discriminatedUnion("action", [
    z.object({
      action: z.enum(messageDeleteActionEnum.enumValues),
      chat_id: z.string().transform(Number),
      message_ids: z.array(z.number()).min(1),
    }),
    z.object({
      action: z.literal("clear_chat"),
      chat_id: z.string().transform(Number),
    }),
  ]),
});

export const ChatDeleteMessageSuccessSchema = createSuccessResponseSchema(
  z.array(z.union([ChatMessageDeleteSelectSchema, ChatClearStateSelectSchema])),
);

// ============================================
// MESSAGE STATUS SCHEMAS
// ============================================

export const ChatMessageStatusSuccessSchema = createSuccessResponseSchema(
  z.object({
    statuses: z.array(
      z.object({
        user_id: z.number(),
        status: z.enum(["read", "delivered"]),
      }),
    ),
  }),
);

// ============================================
// SEARCH MESSAGE SCHEMAS
// ============================================

const ChatSearchMessageSchema = z.object({
  id: z.number(),
  message: z.string().nullable(),
  highlighted_message: z.string().nullable(),
  created_at: z.date().transform((d) => d.toISOString()),
  rank: z.number(),
});

const ChatSearchMessagesResponseSchema = z.object({
  data: z.array(ChatSearchMessageSchema),
  nextCursor: z.string().nullable(),
});

export const ChatSearchMessageSuccessSchema = createSuccessResponseSchema(
  ChatSearchMessagesResponseSchema,
);

// ============================================
// TYPE EXPORTS
// ============================================

export type InternalChatMessageRequest = z.infer<typeof GetChatMessagesSchema>;
export type UploadApiResponse = z.infer<typeof UploadApiResponseSchema>;
export type ReplyData = z.infer<typeof ReplyDataSchema>;
export type SystemData = z.infer<typeof SystemData>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type PagingInfo = z.infer<typeof PagingInfoSchema>;
export type ChatMessagesResponse = z.infer<typeof ChatMessagesResponseSchema>;
