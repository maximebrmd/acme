CREATE SCHEMA "channels";
--> statement-breakpoint
CREATE TABLE "channels"."channels" (
	"access_token" text NOT NULL,
	"account_id" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone NOT NULL,
	"display_name" text,
	"handle" text NOT NULL,
	"id" uuid PRIMARY KEY,
	"platform" text NOT NULL,
	"refresh_needed" boolean NOT NULL,
	"refresh_token" text,
	"scopes" text[] NOT NULL,
	"status" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"token_issued_at" timestamp with time zone,
	"token_key_id" text NOT NULL,
	"token_kind" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "channels_workspace_platform_account" UNIQUE("workspace_id","platform","account_id"),
	CONSTRAINT "channels_status" CHECK ("status" IN ('active', 'refreshNeeded', 'disabled')),
	CONSTRAINT "channels_refresh_needed" CHECK (("status" <> 'active' OR NOT "refresh_needed") AND ("status" <> 'refreshNeeded' OR "refresh_needed")),
	CONSTRAINT "channels_token_lifetime" CHECK (CASE "token_kind" WHEN 'nonExpiring' THEN "token_expires_at" IS NULL AND "token_issued_at" IS NULL WHEN 'refreshable' THEN "token_expires_at" IS NOT NULL AND "token_issued_at" IS NULL WHEN 'nonRefreshable' THEN "token_expires_at" IS NOT NULL AND "token_issued_at" IS NOT NULL ELSE FALSE END),
	CONSTRAINT "channels_token_key" CHECK (split_part("access_token", '.', 1) = "token_key_id" AND ("refresh_token" IS NULL OR split_part("refresh_token", '.', 1) = "token_key_id"))
);
