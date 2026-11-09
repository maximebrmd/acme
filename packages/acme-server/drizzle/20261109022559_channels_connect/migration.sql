CREATE SCHEMA "notifications";
--> statement-breakpoint
CREATE TABLE "channels"."connect_attempts" (
	"channel_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"instance" text,
	"platform" text NOT NULL,
	"secret" text NOT NULL,
	"started_by" text NOT NULL,
	"state_hash" text PRIMARY KEY,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channels"."mastodon_apps" (
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"instance" text,
	"redirect_uri" text,
	"scopes" text NOT NULL,
	CONSTRAINT "mastodon_apps_pkey" PRIMARY KEY("instance","redirect_uri")
);
--> statement-breakpoint
CREATE TABLE "notifications"."sent_notices" (
	"key" text PRIMARY KEY,
	"sent_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "channels_token_expiry" ON "channels"."channels" ("token_expires_at") WHERE "status" = 'active' AND "token_kind" <> 'nonExpiring';--> statement-breakpoint
CREATE INDEX "connect_attempts_expires_at" ON "channels"."connect_attempts" ("expires_at");