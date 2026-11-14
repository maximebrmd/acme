CREATE TABLE "engagement"."conversations" (
	"channel_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"last_incoming_at" timestamp with time zone,
	"last_message_at" timestamp with time zone NOT NULL,
	"participants" jsonb NOT NULL,
	"platform_conversation_id" text NOT NULL,
	"read_at" timestamp with time zone,
	"checked_at" timestamp with time zone,
	"request" boolean DEFAULT false NOT NULL,
	"revision" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "conversations_participants" CHECK (jsonb_typeof("participants") = 'array')
);
--> statement-breakpoint
CREATE TABLE "engagement"."direct_messages" (
	"attachments" integer DEFAULT 0 NOT NULL,
	"channel_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"from_account" boolean NOT NULL,
	"id" uuid PRIMARY KEY,
	"platform_message_id" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"sender_platform_id" text,
	"sent_at" timestamp with time zone NOT NULL,
	"text" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "direct_messages_attachments" CHECK ("attachments" >= 0),
	CONSTRAINT "direct_messages_sender" CHECK (NOT "from_account" OR "sender_platform_id" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "engagement"."message_applications" (
	"client_id" text,
	"granted_at" timestamp with time zone NOT NULL,
	"granted_by" uuid,
	"workspace_id" uuid,
	CONSTRAINT "message_applications_pkey" PRIMARY KEY("workspace_id","client_id")
);
--> statement-breakpoint
CREATE TABLE "engagement"."message_boxes" (
	"channel_id" uuid PRIMARY KEY,
	"created_at" timestamp with time zone NOT NULL,
	"last_read_at" timestamp with time zone,
	"next_read_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement"."message_channels" (
	"channel_id" uuid PRIMARY KEY,
	"enabled_at" timestamp with time zone NOT NULL,
	"enabled_by" uuid,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement"."outgoing_messages" (
	"attempted_at" timestamp with time zone,
	"author_id" uuid,
	"call_claimed_at" timestamp with time zone,
	"channel_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"key_digest" text,
	"platform_message_id" text,
	"reason" text,
	"settled_at" timestamp with time zone,
	"status" text NOT NULL,
	"text" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "outgoing_messages_status" CHECK ("status" IN ('sending', 'sent', 'failed', 'unconfirmed')),
	CONSTRAINT "outgoing_messages_settled" CHECK (("status" = 'sending') = ("settled_at" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_platform_id" ON "engagement"."conversations" ("channel_id","platform_conversation_id");--> statement-breakpoint
CREATE INDEX "conversations_workspace_listed" ON "engagement"."conversations" ("workspace_id","last_message_at","id");--> statement-breakpoint
CREATE INDEX "conversations_last_message" ON "engagement"."conversations" ("last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "direct_messages_platform_id" ON "engagement"."direct_messages" ("conversation_id","platform_message_id");--> statement-breakpoint
CREATE INDEX "direct_messages_conversation_sent" ON "engagement"."direct_messages" ("conversation_id","sent_at");--> statement-breakpoint
CREATE INDEX "message_boxes_due" ON "engagement"."message_boxes" ("next_read_at","channel_id");--> statement-breakpoint
CREATE INDEX "message_boxes_workspace" ON "engagement"."message_boxes" ("workspace_id");--> statement-breakpoint
CREATE INDEX "message_channels_workspace" ON "engagement"."message_channels" ("workspace_id");--> statement-breakpoint
CREATE INDEX "outgoing_messages_conversation" ON "engagement"."outgoing_messages" ("conversation_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "outgoing_messages_pending" ON "engagement"."outgoing_messages" ("conversation_id") WHERE "status" IN ('sending', 'unconfirmed');--> statement-breakpoint
CREATE UNIQUE INDEX "outgoing_messages_key" ON "engagement"."outgoing_messages" ("workspace_id","key_digest") WHERE "key_digest" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "outgoing_messages_sending" ON "engagement"."outgoing_messages" ("created_at","id") WHERE "status" = 'sending';--> statement-breakpoint
CREATE INDEX "outgoing_messages_author" ON "engagement"."outgoing_messages" ("author_id") WHERE "author_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "engagement"."direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "engagement"."conversations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "engagement"."outgoing_messages" ADD CONSTRAINT "outgoing_messages_conversation_id_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "engagement"."conversations"("id") ON DELETE CASCADE;