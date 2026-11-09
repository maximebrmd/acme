CREATE SCHEMA "media";
--> statement-breakpoint
CREATE SCHEMA "publishing";
--> statement-breakpoint
CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE TABLE "media"."media_assets" (
	"byte_size" bigint NOT NULL,
	"codec" text,
	"content_type" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"duration_ms" integer,
	"height" integer,
	"id" uuid PRIMARY KEY,
	"multipart_part_size" integer,
	"multipart_upload_id" text,
	"rejection_reason" text,
	"status" text NOT NULL,
	"storage_key" text NOT NULL UNIQUE,
	"updated_at" timestamp with time zone NOT NULL,
	"width" integer,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "media_assets_status" CHECK ("status" IN ('pending', 'uploaded', 'ready', 'rejected')),
	CONSTRAINT "media_assets_multipart_upload" CHECK (("multipart_upload_id" IS NULL) = ("multipart_part_size" IS NULL) AND ("multipart_upload_id" IS NULL OR "status" = 'pending')),
	CONSTRAINT "media_assets_rejection_reason" CHECK (("rejection_reason" IS NULL) = ("status" <> 'rejected')),
	CONSTRAINT "media_assets_dimensions" CHECK (("width" IS NULL) = ("height" IS NULL))
);
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
	"target_id" uuid NOT NULL,
	CONSTRAINT "publication_calls_target_round_attempt" UNIQUE("target_id","round","attempt")
);
--> statement-breakpoint
CREATE TABLE "auth"."account" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."apikey" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"config_id" text DEFAULT 'default' NOT NULL,
	"name" text,
	"start" text,
	"reference_id" text NOT NULL,
	"prefix" text,
	"key" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp with time zone,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer DEFAULT 60000,
	"rate_limit_max" integer DEFAULT 600,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"last_request" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "auth"."invitation" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"inviter_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."member" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."organization" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"logo" text,
	"created_at" timestamp with time zone NOT NULL,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "auth"."rate_limit" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"key" text NOT NULL UNIQUE,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."session" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"active_organization_id" text,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "auth"."user" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"locale" text DEFAULT 'en'
);
--> statement-breakpoint
CREATE TABLE "auth"."verification" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "media_assets_workspace_id_index" ON "media"."media_assets" ("workspace_id");--> statement-breakpoint
CREATE INDEX "posts_workspace_scheduled_at" ON "publishing"."posts" ("workspace_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "auth"."account" ("user_id");--> statement-breakpoint
CREATE INDEX "apikey_configId_idx" ON "auth"."apikey" ("config_id");--> statement-breakpoint
CREATE INDEX "apikey_referenceId_idx" ON "auth"."apikey" ("reference_id");--> statement-breakpoint
CREATE INDEX "apikey_key_idx" ON "auth"."apikey" ("key");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "auth"."invitation" ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "auth"."invitation" ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "auth"."member" ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "auth"."member" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "auth"."organization" ("slug");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "auth"."session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "auth"."verification" ("identifier");--> statement-breakpoint
ALTER TABLE "publishing"."post_targets" ADD CONSTRAINT "post_targets_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "publishing"."posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."publication_attempts" ADD CONSTRAINT "publication_attempts_target_id_post_targets_id_fkey" FOREIGN KEY ("target_id") REFERENCES "publishing"."post_targets"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."publication_calls" ADD CONSTRAINT "publication_calls_target_id_post_targets_id_fkey" FOREIGN KEY ("target_id") REFERENCES "publishing"."post_targets"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."member" ADD CONSTRAINT "member_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."member" ADD CONSTRAINT "member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;