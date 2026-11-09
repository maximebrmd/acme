CREATE TABLE "channels"."connect_choices" (
	"accounts" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"platform" text NOT NULL,
	"selection_hash" text PRIMARY KEY,
	"started_by" text NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channels"."data_deletions" (
	"app" text NOT NULL,
	"channels_deleted" integer NOT NULL,
	"code" text PRIMARY KEY,
	"completed_at" timestamp with time zone NOT NULL,
	"requested_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channels"."channels" ADD COLUMN "granted_by" text;--> statement-breakpoint
CREATE INDEX "channels_granted_by" ON "channels"."channels" ("granted_by") WHERE "granted_by" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "connect_choices_expires_at" ON "channels"."connect_choices" ("expires_at");