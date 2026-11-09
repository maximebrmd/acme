CREATE TABLE "notifications"."notices" (
	"created_at" timestamp with time zone NOT NULL,
	"email_settled_at" timestamp with time zone,
	"email_status" text NOT NULL,
	"event" jsonb NOT NULL,
	"event_key" text NOT NULL,
	"id" uuid PRIMARY KEY,
	"kind" text NOT NULL,
	"read_at" timestamp with time zone,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "notices_event_user" UNIQUE("event_key","user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications"."notification_preferences" (
	"email_channel_reconnect" boolean NOT NULL,
	"email_post_failed" boolean NOT NULL,
	"email_post_published" boolean NOT NULL,
	"email_post_unconfirmed" boolean NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"user_id" uuid PRIMARY KEY
);
--> statement-breakpoint
CREATE INDEX "notices_user" ON "notifications"."notices" ("user_id","id");--> statement-breakpoint
CREATE INDEX "notices_user_unread" ON "notifications"."notices" ("user_id") WHERE "read_at" IS NULL;