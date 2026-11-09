CREATE SCHEMA "publishing";
--> statement-breakpoint
CREATE TABLE "publishing"."post_targets" (
	"cancel_requested" boolean DEFAULT false NOT NULL,
	"channel_id" uuid NOT NULL,
	"failure_code" text,
	"failure_reason" text,
	"finished_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"permalink" text,
	"platform_post_id" text,
	"post_id" uuid NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone,
	"status" text NOT NULL,
	"unconfirmed_reason" text,
	CONSTRAINT "post_targets_post_channel" UNIQUE("post_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE "publishing"."posts" (
	"cancelled_at" timestamp with time zone,
	"execution_id" text,
	"finished_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"outcome" text,
	"schedule_revision" integer DEFAULT 0 NOT NULL,
	"schedule_zone" text,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"status" text NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishing"."publication_attempts" (
	"attempt" integer,
	"decision" text NOT NULL,
	"detail" jsonb NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"outcome" text NOT NULL,
	"retry_delay_millis" integer,
	"round" integer,
	"started_at" timestamp with time zone NOT NULL,
	"target_id" uuid,
	CONSTRAINT "publication_attempts_pkey" PRIMARY KEY("target_id","round","attempt")
);
--> statement-breakpoint
CREATE TABLE "publishing"."publication_calls" (
	"attempt" integer NOT NULL,
	"finished_at" timestamp with time zone,
	"idempotency_key" text PRIMARY KEY,
	"operation" text NOT NULL,
	"outcome" jsonb,
	"round" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"target_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE INDEX "posts_workspace_scheduled_at" ON "publishing"."posts" ("workspace_id","scheduled_at");--> statement-breakpoint
ALTER TABLE "publishing"."post_targets" ADD CONSTRAINT "post_targets_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "publishing"."posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."publication_attempts" ADD CONSTRAINT "publication_attempts_target_id_post_targets_id_fkey" FOREIGN KEY ("target_id") REFERENCES "publishing"."post_targets"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."publication_calls" ADD CONSTRAINT "publication_calls_target_id_post_targets_id_fkey" FOREIGN KEY ("target_id") REFERENCES "publishing"."post_targets"("id") ON DELETE CASCADE;