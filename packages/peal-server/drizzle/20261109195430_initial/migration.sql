CREATE SCHEMA "analytics";
--> statement-breakpoint
CREATE SCHEMA "assistant";
--> statement-breakpoint
CREATE SCHEMA "billing";
--> statement-breakpoint
CREATE SCHEMA "channels";
--> statement-breakpoint
CREATE SCHEMA "media";
--> statement-breakpoint
CREATE SCHEMA "notifications";
--> statement-breakpoint
CREATE SCHEMA "publishing";
--> statement-breakpoint
CREATE SCHEMA "staff";
--> statement-breakpoint
CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE TABLE "analytics"."erased_workspaces" (
	"erased_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE "analytics"."metric_snapshots" (
	"collected_at" timestamp with time zone,
	"impressions" integer,
	"likes" integer NOT NULL,
	"quotes" integer,
	"replies" integer NOT NULL,
	"reposts" integer NOT NULL,
	"target_id" uuid,
	CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY("target_id","collected_at"),
	CONSTRAINT "metric_snapshots_counts" CHECK ("likes" >= 0 AND "reposts" >= 0 AND "replies" >= 0 AND coalesce("quotes", 0) >= 0 AND coalesce("impressions", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "analytics"."tracked_posts" (
	"channel_id" uuid NOT NULL,
	"end_reason" text,
	"ended_at" timestamp with time zone,
	"impressions" integer,
	"last_collected_at" timestamp with time zone,
	"likes" integer,
	"next_collection_at" timestamp with time zone,
	"permalink" text,
	"platform_post_id" text NOT NULL,
	"post_id" uuid NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"quotes" integer,
	"replies" integer,
	"reposts" integer,
	"target_id" uuid PRIMARY KEY,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "tracked_posts_collection" CHECK (("next_collection_at" IS NULL) <> ("ended_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "assistant"."daily_usage" (
	"day" date,
	"requests" integer NOT NULL,
	"workspace_id" uuid,
	CONSTRAINT "daily_usage_pkey" PRIMARY KEY("workspace_id","day"),
	CONSTRAINT "daily_usage_requests" CHECK ("requests" >= 0)
);
--> statement-breakpoint
CREATE TABLE "billing"."metered_posts" (
	"month" date,
	"platform" text,
	"posts" integer NOT NULL,
	"posts_with_links" integer NOT NULL,
	"workspace_id" uuid,
	CONSTRAINT "metered_posts_pkey" PRIMARY KEY("workspace_id","platform","month"),
	CONSTRAINT "metered_posts_counts" CHECK ("posts_with_links" >= 0 AND "posts_with_links" <= "posts")
);
--> statement-breakpoint
CREATE TABLE "billing"."orders" (
	"consent_version" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"interval" text NOT NULL,
	"plan" text NOT NULL,
	"trial" boolean NOT NULL,
	"used_at" timestamp with time zone,
	"user_id" text,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."stripe_events" (
	"id" text PRIMARY KEY,
	"received_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."subscriptions" (
	"cancel_at_period_end" boolean NOT NULL,
	"current_period_end" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"interval" text DEFAULT 'month' NOT NULL,
	"last_event_at" timestamp with time zone NOT NULL,
	"last_event_id" text NOT NULL,
	"plan" text NOT NULL,
	"started_at" timestamp with time zone,
	"status" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text PRIMARY KEY,
	"trial_end" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."trials" (
	"plan" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"stripe_subscription_id" text PRIMARY KEY,
	"user_id" text,
	"workspace_id" uuid
);
--> statement-breakpoint
CREATE TABLE "billing"."withdrawals" (
	"currency" text NOT NULL,
	"refunded" bigint NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"stripe_subscription_id" text PRIMARY KEY,
	"user_id" text,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channels"."channels" (
	"access_token" text NOT NULL,
	"account_id" text NOT NULL,
	"avatar_url" text,
	"connection" text,
	"created_at" timestamp with time zone NOT NULL,
	"display_name" text,
	"granted_by" text,
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
--> statement-breakpoint
CREATE TABLE "channels"."connect_attempts" (
	"channel_id" uuid,
	"connection" text,
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
CREATE TABLE "channels"."connect_choices" (
	"accounts" text NOT NULL,
	"connection" text,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"granted_by" text,
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
	"request_digest" text NOT NULL CONSTRAINT "data_deletions_request_digest" UNIQUE,
	"requested_at" timestamp with time zone NOT NULL
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
CREATE TABLE "media"."media_assets" (
	"alt_text" text,
	"byte_size" bigint NOT NULL,
	"codec" text,
	"content_type" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"duration_ms" integer,
	"height" integer,
	"id" uuid PRIMARY KEY,
	"multipart_part_size" integer,
	"multipart_upload_id" text,
	"probe_state" text,
	"rejection_reason" text,
	"status" text NOT NULL,
	"storage_key" text NOT NULL UNIQUE,
	"updated_at" timestamp with time zone NOT NULL,
	"width" integer,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "media_assets_status" CHECK ("status" IN ('pending', 'uploaded', 'ready', 'rejected')),
	CONSTRAINT "media_assets_multipart_upload" CHECK (("multipart_upload_id" IS NULL) = ("multipart_part_size" IS NULL) AND ("multipart_upload_id" IS NULL OR "status" = 'pending')),
	CONSTRAINT "media_assets_probe_state" CHECK ("probe_state" IS NULL OR "status" = 'uploaded'),
	CONSTRAINT "media_assets_rejection_reason" CHECK (("rejection_reason" IS NULL) = ("status" <> 'rejected')),
	CONSTRAINT "media_assets_dimensions" CHECK (("width" IS NULL) = ("height" IS NULL))
);
--> statement-breakpoint
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
	"every_post" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"user_id" uuid PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE "notifications"."sent_notices" (
	"key" text PRIMARY KEY,
	"sent_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishing"."post_targets" (
	"cancel_requested" boolean DEFAULT false NOT NULL,
	"channel_id" uuid NOT NULL,
	"failure_code" text,
	"failure_reason" text,
	"finished_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"kept_private" boolean DEFAULT false NOT NULL,
	"options" jsonb,
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
	"author_id" uuid,
	"cancelled_at" timestamp with time zone,
	"execution_id" text,
	"finished_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"media" jsonb DEFAULT '[]' NOT NULL,
	"outcome" text,
	"schedule_revision" integer DEFAULT 0 NOT NULL,
	"schedule_zone" text,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"status" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"text_overrides" jsonb DEFAULT '[]' NOT NULL,
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
	"progress" jsonb,
	"round" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"target_id" uuid NOT NULL,
	CONSTRAINT "publication_calls_target_round_attempt" UNIQUE("target_id","round","attempt")
);
--> statement-breakpoint
CREATE TABLE "publishing"."quota_usage" (
	"bucket" text,
	"day" date,
	"units" integer NOT NULL,
	CONSTRAINT "quota_usage_pkey" PRIMARY KEY("bucket","day"),
	CONSTRAINT "quota_usage_units" CHECK ("units" >= 0)
);
--> statement-breakpoint
CREATE TABLE "publishing"."upload_sessions" (
	"byte_size" bigint NOT NULL,
	"final_part_sent" boolean DEFAULT false NOT NULL,
	"idempotency_key" text PRIMARY KEY,
	"opened_at" timestamp with time zone NOT NULL,
	"session_url" text,
	"video_id" text
);
--> statement-breakpoint
CREATE TABLE "staff"."audit_events" (
	"action" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"ban_expires_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"object_ids" jsonb DEFAULT '{}' NOT NULL,
	"operation" text,
	"reason" text,
	"staff_id" uuid,
	"target_id" uuid,
	"workspace_id" uuid
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
CREATE TABLE "auth"."device_code" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"device_code" text NOT NULL,
	"user_code" text NOT NULL,
	"user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"last_polled_at" timestamp with time zone,
	"polling_interval" integer,
	"client_id" text,
	"scope" text,
	"resources" text[],
	"oauth_client_id" text
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
CREATE TABLE "auth"."jwks" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"alg" text,
	"crv" text
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
CREATE TABLE "auth"."oauth_access_token" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"token" text UNIQUE,
	"client_id" text NOT NULL,
	"session_id" uuid,
	"user_id" uuid,
	"reference_id" text,
	"authorization_code_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"refresh_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"revoked" timestamp with time zone,
	"confirmation" jsonb,
	"scopes" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_client" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"client_id" text NOT NULL UNIQUE,
	"client_secret" text,
	"client_discovery_id" text,
	"disabled" boolean DEFAULT false,
	"skip_consent" boolean,
	"enable_end_session" boolean,
	"subject_type" text,
	"scopes" text[],
	"client_credentials_scopes" text[] DEFAULT '{}'::text[],
	"user_id" uuid,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"name" text,
	"uri" text,
	"icon" text,
	"contacts" text[],
	"tos" text,
	"policy" text,
	"software_id" text,
	"software_version" text,
	"software_statement" text,
	"redirect_uris" text[] NOT NULL,
	"post_logout_redirect_uris" text[],
	"backchannel_logout_uri" text,
	"backchannel_logout_session_required" boolean,
	"token_endpoint_auth_method" text,
	"application_type" text,
	"jwks" text,
	"jwks_uri" text,
	"grant_types" text[],
	"response_types" text[],
	"require_pkce" boolean,
	"dpop_bound_access_tokens" boolean DEFAULT false,
	"reference_id" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_client_assertion" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_client_resource" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"client_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_consent" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"client_id" text NOT NULL,
	"user_id" uuid,
	"reference_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"scopes" text[] NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_refresh_token" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"token" text NOT NULL UNIQUE,
	"client_id" text NOT NULL,
	"session_id" uuid,
	"user_id" uuid NOT NULL,
	"reference_id" text,
	"authorization_code_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"revoked" timestamp with time zone,
	"rotated_at" timestamp with time zone,
	"rotation_replay_response" text,
	"rotation_replay_expires_at" timestamp with time zone,
	"auth_time" timestamp with time zone,
	"confirmation" jsonb,
	"scopes" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_resource" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"identifier" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"access_token_ttl" integer,
	"refresh_token_ttl" integer,
	"signing_algorithm" text,
	"signing_key_id" text,
	"allowed_scopes" text[],
	"custom_claims" jsonb,
	"dpop_bound_access_tokens_required" boolean DEFAULT false,
	"disabled" boolean DEFAULT false,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"policy_version" integer DEFAULT 1,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "auth"."organization" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"logo" text,
	"created_at" timestamp with time zone NOT NULL,
	"metadata" text,
	"stripe_customer_id" text
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
CREATE TABLE "auth"."subscription" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"plan" text NOT NULL,
	"reference_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'incomplete',
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"trial_start" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false,
	"cancel_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"seats" integer,
	"billing_interval" text,
	"stripe_schedule_id" text
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
	"stripe_customer_id" text,
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
CREATE INDEX "tracked_posts_due" ON "analytics"."tracked_posts" ("next_collection_at","target_id") WHERE "next_collection_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "tracked_posts_workspace_published" ON "analytics"."tracked_posts" ("workspace_id","published_at");--> statement-breakpoint
CREATE INDEX "tracked_posts_post" ON "analytics"."tracked_posts" ("post_id");--> statement-breakpoint
CREATE INDEX "tracked_posts_published" ON "analytics"."tracked_posts" ("published_at","target_id");--> statement-breakpoint
CREATE INDEX "orders_workspace" ON "billing"."orders" ("workspace_id");--> statement-breakpoint
CREATE INDEX "subscriptions_workspace" ON "billing"."subscriptions" ("workspace_id");--> statement-breakpoint
CREATE INDEX "subscriptions_reminders" ON "billing"."subscriptions" ("status","current_period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "trials_user" ON "billing"."trials" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trials_workspace" ON "billing"."trials" ("workspace_id");--> statement-breakpoint
CREATE INDEX "withdrawals_workspace" ON "billing"."withdrawals" ("workspace_id");--> statement-breakpoint
CREATE INDEX "channels_token_expiry" ON "channels"."channels" ("token_expires_at") WHERE "status" = 'active' AND "token_kind" <> 'nonExpiring';--> statement-breakpoint
CREATE INDEX "channels_granted_by" ON "channels"."channels" ("granted_by") WHERE "granted_by" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "connect_attempts_expires_at" ON "channels"."connect_attempts" ("expires_at");--> statement-breakpoint
CREATE INDEX "connect_choices_expires_at" ON "channels"."connect_choices" ("expires_at");--> statement-breakpoint
CREATE INDEX "connect_choices_granted_by" ON "channels"."connect_choices" ("granted_by") WHERE "granted_by" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "media_assets_workspace_id_id_index" ON "media"."media_assets" ("workspace_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notices_user" ON "notifications"."notices" ("user_id","id");--> statement-breakpoint
CREATE INDEX "notices_user_unread" ON "notifications"."notices" ("user_id") WHERE "read_at" IS NULL;--> statement-breakpoint
CREATE INDEX "post_targets_published" ON "publishing"."post_targets" ("finished_at","id") WHERE "status" = 'published';--> statement-breakpoint
CREATE INDEX "posts_workspace_scheduled_at" ON "publishing"."posts" ("workspace_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "posts_workspace_drafts" ON "publishing"."posts" ("workspace_id","id") WHERE "status" = 'draft';--> statement-breakpoint
CREATE INDEX "audit_events_at" ON "staff"."audit_events" ("at","id");--> statement-breakpoint
CREATE INDEX "audit_events_target" ON "staff"."audit_events" ("target_id","at");--> statement-breakpoint
CREATE INDEX "audit_events_staff" ON "staff"."audit_events" ("staff_id");--> statement-breakpoint
CREATE INDEX "audit_events_workspace" ON "staff"."audit_events" ("workspace_id","at");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "auth"."account" ("user_id");--> statement-breakpoint
CREATE INDEX "apikey_configId_idx" ON "auth"."apikey" ("config_id");--> statement-breakpoint
CREATE INDEX "apikey_referenceId_idx" ON "auth"."apikey" ("reference_id");--> statement-breakpoint
CREATE INDEX "apikey_key_idx" ON "auth"."apikey" ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "deviceCode_deviceCode_uidx" ON "auth"."device_code" ("device_code");--> statement-breakpoint
CREATE UNIQUE INDEX "deviceCode_userCode_uidx" ON "auth"."device_code" ("user_code");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "auth"."invitation" ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "auth"."invitation" ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "auth"."member" ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "auth"."member" ("user_id");--> statement-breakpoint
CREATE INDEX "oauthAccessToken_clientId_idx" ON "auth"."oauth_access_token" ("client_id");--> statement-breakpoint
CREATE INDEX "oauthAccessToken_sessionId_idx" ON "auth"."oauth_access_token" ("session_id");--> statement-breakpoint
CREATE INDEX "oauthAccessToken_userId_idx" ON "auth"."oauth_access_token" ("user_id");--> statement-breakpoint
CREATE INDEX "oauthAccessToken_authorizationCodeId_idx" ON "auth"."oauth_access_token" ("authorization_code_id");--> statement-breakpoint
CREATE INDEX "oauthAccessToken_refreshId_idx" ON "auth"."oauth_access_token" ("refresh_id");--> statement-breakpoint
CREATE INDEX "oauthClient_userId_idx" ON "auth"."oauth_client" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauthClientResource_clientId_resourceId_uidx" ON "auth"."oauth_client_resource" ("client_id","resource_id");--> statement-breakpoint
CREATE INDEX "oauthClientResource_clientId_idx" ON "auth"."oauth_client_resource" ("client_id");--> statement-breakpoint
CREATE INDEX "oauthClientResource_resourceId_idx" ON "auth"."oauth_client_resource" ("resource_id");--> statement-breakpoint
CREATE INDEX "oauthConsent_clientId_idx" ON "auth"."oauth_consent" ("client_id");--> statement-breakpoint
CREATE INDEX "oauthConsent_userId_idx" ON "auth"."oauth_consent" ("user_id");--> statement-breakpoint
CREATE INDEX "oauthRefreshToken_clientId_idx" ON "auth"."oauth_refresh_token" ("client_id");--> statement-breakpoint
CREATE INDEX "oauthRefreshToken_sessionId_idx" ON "auth"."oauth_refresh_token" ("session_id");--> statement-breakpoint
CREATE INDEX "oauthRefreshToken_userId_idx" ON "auth"."oauth_refresh_token" ("user_id");--> statement-breakpoint
CREATE INDEX "oauthRefreshToken_authorizationCodeId_idx" ON "auth"."oauth_refresh_token" ("authorization_code_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "auth"."organization" ("slug");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "auth"."session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "auth"."verification" ("identifier");--> statement-breakpoint
ALTER TABLE "analytics"."metric_snapshots" ADD CONSTRAINT "metric_snapshots_target_id_tracked_posts_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "analytics"."tracked_posts"("target_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."post_targets" ADD CONSTRAINT "post_targets_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "publishing"."posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."publication_attempts" ADD CONSTRAINT "publication_attempts_target_id_post_targets_id_fkey" FOREIGN KEY ("target_id") REFERENCES "publishing"."post_targets"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."publication_calls" ADD CONSTRAINT "publication_calls_target_id_post_targets_id_fkey" FOREIGN KEY ("target_id") REFERENCES "publishing"."post_targets"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."upload_sessions" ADD CONSTRAINT "upload_sessions_72ct0kRYe5re_fkey" FOREIGN KEY ("idempotency_key") REFERENCES "publishing"."publication_calls"("idempotency_key") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."member" ADD CONSTRAINT "member_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."member" ADD CONSTRAINT "member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_access_token" ADD CONSTRAINT "oauth_access_token_client_id_oauth_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_access_token" ADD CONSTRAINT "oauth_access_token_session_id_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."session"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "auth"."oauth_access_token" ADD CONSTRAINT "oauth_access_token_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_access_token" ADD CONSTRAINT "oauth_access_token_refresh_id_oauth_refresh_token_id_fkey" FOREIGN KEY ("refresh_id") REFERENCES "auth"."oauth_refresh_token"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_client" ADD CONSTRAINT "oauth_client_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_client_resource" ADD CONSTRAINT "oauth_client_resource_client_id_oauth_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_client_resource" ADD CONSTRAINT "oauth_client_resource_dn2L1gs9Dolm_fkey" FOREIGN KEY ("resource_id") REFERENCES "auth"."oauth_resource"("identifier") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_consent" ADD CONSTRAINT "oauth_consent_client_id_oauth_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_consent" ADD CONSTRAINT "oauth_consent_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_client_id_oauth_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_session_id_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."session"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "auth"."oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;