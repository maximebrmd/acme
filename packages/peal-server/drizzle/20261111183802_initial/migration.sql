CREATE SCHEMA "activity";
--> statement-breakpoint
CREATE SCHEMA "ads";
--> statement-breakpoint
CREATE SCHEMA "analytics";
--> statement-breakpoint
CREATE SCHEMA "assistant";
--> statement-breakpoint
CREATE SCHEMA "billing";
--> statement-breakpoint
CREATE SCHEMA "channels";
--> statement-breakpoint
CREATE SCHEMA "engagement";
--> statement-breakpoint
CREATE SCHEMA "legal";
--> statement-breakpoint
CREATE SCHEMA "media";
--> statement-breakpoint
CREATE SCHEMA "notifications";
--> statement-breakpoint
CREATE SCHEMA "publishing";
--> statement-breakpoint
CREATE SCHEMA "review";
--> statement-breakpoint
CREATE SCHEMA "staff";
--> statement-breakpoint
CREATE SCHEMA "webhooks";
--> statement-breakpoint
CREATE SCHEMA "workspace";
--> statement-breakpoint
CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE TABLE "activity"."events" (
	"actor_kind" text NOT NULL,
	"api_key_id" text,
	"application_id" text,
	"application_name" text,
	"error_code" text,
	"id" uuid PRIMARY KEY,
	"impersonated" boolean NOT NULL,
	"object_ids" jsonb DEFAULT '{}' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"operation" text NOT NULL,
	"request_id" text,
	"status" integer,
	"user_id" uuid,
	"via" text NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity"."request_counts" (
	"requests" integer NOT NULL,
	"subject" text,
	"window_start" timestamp with time zone,
	CONSTRAINT "request_counts_pkey" PRIMARY KEY("subject","window_start"),
	CONSTRAINT "request_counts_requests" CHECK ("requests" > 0)
);
--> statement-breakpoint
CREATE TABLE "ads"."accounts" (
	"amount_spent" bigint,
	"authorized_at" timestamp with time zone,
	"authorized_by" uuid,
	"connected_at" timestamp with time zone NOT NULL,
	"connected_by" uuid,
	"currency" text NOT NULL,
	"external_id" text NOT NULL,
	"grant_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY,
	"monthly_ceiling" bigint,
	"name" text NOT NULL,
	"network" text NOT NULL,
	"next_sync_at" timestamp with time zone NOT NULL,
	"spend_cap" bigint,
	"spending_enabled" boolean DEFAULT false NOT NULL,
	"status" text NOT NULL,
	"synced_at" timestamp with time zone,
	"time_zone" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "accounts_external" UNIQUE("workspace_id","network","external_id"),
	CONSTRAINT "accounts_ceiling" CHECK (("spending_enabled" = false) OR ("monthly_ceiling" IS NOT NULL AND "monthly_ceiling" > 0))
);
--> statement-breakpoint
CREATE TABLE "ads"."ad_sets" (
	"account_id" uuid,
	"external_id" text,
	"name" text NOT NULL,
	"raw_status" text NOT NULL,
	"status" text NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid NOT NULL,
	"daily_budget" bigint,
	"ends_at" timestamp with time zone,
	"starts_at" timestamp with time zone,
	"total_budget" bigint,
	"campaign_external_id" text NOT NULL,
	CONSTRAINT "ad_sets_pkey" PRIMARY KEY("account_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "ads"."ads" (
	"account_id" uuid,
	"external_id" text,
	"name" text NOT NULL,
	"raw_status" text NOT NULL,
	"status" text NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid NOT NULL,
	"ad_set_external_id" text NOT NULL,
	"campaign_external_id" text NOT NULL,
	"post_id" uuid,
	"promoted_instagram_media_id" text,
	"promoted_page_post_id" text,
	"target_id" uuid,
	CONSTRAINT "ads_pkey" PRIMARY KEY("account_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "ads"."audit_events" (
	"account_id" uuid,
	"action" text NOT NULL,
	"amounts" jsonb NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"boost_id" uuid,
	"by_client" text,
	"by_id" text,
	"by_kind" text,
	"currency" text,
	"id" uuid PRIMARY KEY,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ads"."boosts" (
	"account_external_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"account_network" text NOT NULL,
	"activated_at" timestamp with time zone,
	"ad_id" text,
	"ad_set_id" text,
	"audience" jsonb NOT NULL,
	"beneficiary" text,
	"budget_amount" bigint NOT NULL,
	"budget_kind" text NOT NULL,
	"budget_reached_at" timestamp with time zone,
	"campaign_id" text,
	"channel_id" uuid NOT NULL,
	"committed" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"currency" text NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"failure_code" text,
	"failure_reason" text,
	"id" uuid PRIMARY KEY,
	"idempotency_key" text NOT NULL,
	"objective" text NOT NULL,
	"payer" text,
	"platform" text NOT NULL,
	"post_id" uuid NOT NULL,
	"requested_by_client" text,
	"requested_by_id" text,
	"requested_by_kind" text,
	"starts_at" timestamp with time zone NOT NULL,
	"state" text NOT NULL,
	"state_at" timestamp with time zone NOT NULL,
	"target_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "boosts_key" UNIQUE("workspace_id","idempotency_key"),
	CONSTRAINT "boosts_state" CHECK ("state" IN ('requested', 'active', 'paused', 'ended', 'stopped', 'failed', 'unconfirmed')),
	CONSTRAINT "boosts_budget_kind" CHECK ("budget_kind" IN ('total', 'daily')),
	CONSTRAINT "boosts_amounts" CHECK ("budget_amount" > 0 AND "committed" >= 0),
	CONSTRAINT "boosts_run" CHECK ("ends_at" > "starts_at"),
	CONSTRAINT "boosts_failure" CHECK (("state" = 'failed') = ("failure_reason" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "ads"."campaigns" (
	"account_id" uuid,
	"external_id" text,
	"name" text NOT NULL,
	"raw_status" text NOT NULL,
	"status" text NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid NOT NULL,
	"daily_budget" bigint,
	"ends_at" timestamp with time zone,
	"starts_at" timestamp with time zone,
	"total_budget" bigint,
	"objective" text NOT NULL,
	CONSTRAINT "campaigns_pkey" PRIMARY KEY("account_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "ads"."grants" (
	"access" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"granted_by" uuid,
	"id" uuid PRIMARY KEY,
	"network" text NOT NULL,
	"platform_user_id" text NOT NULL,
	"scopes" text[] NOT NULL,
	"token" text NOT NULL,
	"token_key_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "grants_person" UNIQUE("workspace_id","network","platform_user_id"),
	CONSTRAINT "grants_access" CHECK ("access" IN ('working', 'reconnectNeeded'))
);
--> statement-breakpoint
CREATE TABLE "ads"."insight_days" (
	"account_id" uuid,
	"ad_external_id" text,
	"clicks" integer NOT NULL,
	"day" date,
	"impressions" integer NOT NULL,
	"reach" integer NOT NULL,
	"results" integer,
	"spend" bigint NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "insight_days_pkey" PRIMARY KEY("account_id","ad_external_id","day")
);
--> statement-breakpoint
CREATE TABLE "ads"."sign_in_attempts" (
	"expires_at" timestamp with time zone NOT NULL,
	"network" text NOT NULL,
	"started_by" uuid NOT NULL,
	"state_hash" text PRIMARY KEY,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ads"."spend_calls" (
	"boost_id" uuid NOT NULL,
	"finished_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"network_code" text,
	"object_id" text,
	"outcome" text,
	"started_at" timestamp with time zone NOT NULL,
	"step" text NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics"."account_snapshots" (
	"channel_id" uuid,
	"collected_at" timestamp with time zone NOT NULL,
	"day" date,
	"followers" integer,
	"following" integer,
	"posts" integer,
	"reach" integer,
	"views" integer,
	CONSTRAINT "account_snapshots_pkey" PRIMARY KEY("channel_id","day"),
	CONSTRAINT "account_snapshots_counts" CHECK (coalesce("followers", 0) >= 0 AND coalesce("following", 0) >= 0 AND coalesce("posts", 0) >= 0 AND coalesce("reach", 0) >= 0 AND coalesce("views", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "analytics"."erased_workspaces" (
	"erased_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE "analytics"."metric_snapshots" (
	"clicks" integer,
	"collected_at" timestamp with time zone,
	"impressions" integer,
	"likes" integer NOT NULL,
	"quotes" integer,
	"reach" integer,
	"replies" integer NOT NULL,
	"reposts" integer NOT NULL,
	"saves" integer,
	"target_id" uuid,
	CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY("target_id","collected_at"),
	CONSTRAINT "metric_snapshots_counts" CHECK ("likes" >= 0 AND "reposts" >= 0 AND "replies" >= 0 AND coalesce("quotes", 0) >= 0 AND coalesce("impressions", 0) >= 0 AND coalesce("clicks", 0) >= 0 AND coalesce("reach", 0) >= 0 AND coalesce("saves", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "analytics"."paid_reads" (
	"day" date,
	"platform" text,
	"resource" text,
	"workspace_id" uuid,
	CONSTRAINT "paid_reads_pkey" PRIMARY KEY("workspace_id","platform","day","resource")
);
--> statement-breakpoint
CREATE TABLE "analytics"."tracked_channels" (
	"account_ref" text,
	"channel_id" uuid PRIMARY KEY,
	"gone_at" timestamp with time zone,
	"last_collected_at" timestamp with time zone,
	"next_collection_at" timestamp with time zone NOT NULL,
	"platform" text NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics"."tracked_posts" (
	"channel_id" uuid NOT NULL,
	"clicks" integer,
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
	"reach" integer,
	"replies" integer,
	"reposts" integer,
	"saves" integer,
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
CREATE TABLE "billing"."contract_references" (
	"issued_at" timestamp with time zone NOT NULL,
	"reference" text PRIMARY KEY,
	"stripe_subscription_id" text NOT NULL UNIQUE,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."contract_requests" (
	"acknowledged_at" timestamp with time zone,
	"acknowledgement" text NOT NULL,
	"channel" text NOT NULL,
	"confirmation_digest" text,
	"confirmation_expires_at" timestamp with time zone,
	"contract" text,
	"currency" text,
	"desired_at" timestamp with time zone,
	"effective_at" timestamp with time zone,
	"email" text,
	"erased_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"intent" jsonb,
	"kind" text NOT NULL,
	"locale" text NOT NULL,
	"name" text,
	"received_at" timestamp with time zone NOT NULL,
	"refunded" bigint,
	"refusal" text,
	"settled_at" timestamp with time zone,
	"status" text NOT NULL,
	"stripe_subscription_id" text,
	"user_id" text,
	"workspace_id" uuid
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
	"erased_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"interval" text NOT NULL,
	"plan" text NOT NULL,
	"stripe_customer_id" text,
	"trial" boolean NOT NULL,
	"used_at" timestamp with time zone,
	"user_id" text,
	"workspace_id" uuid
);
--> statement-breakpoint
CREATE TABLE "billing"."stripe_events" (
	"id" text PRIMARY KEY,
	"received_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."subscriptions" (
	"cancel_at" timestamp with time zone,
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
	"forgotten_at" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"plan" text,
	"reserved_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"stripe_subscription_id" text,
	"user_id" text,
	"user_pseudonym" text,
	"workspace_id" uuid
);
--> statement-breakpoint
CREATE TABLE "billing"."usage_days" (
	"day" date,
	"dimension" text DEFAULT '',
	"meter" text,
	"quantity" bigint NOT NULL,
	"workspace_id" uuid,
	CONSTRAINT "usage_days_pkey" PRIMARY KEY("workspace_id","day","meter","dimension"),
	CONSTRAINT "usage_days_quantity" CHECK ("quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "billing"."withdrawals" (
	"currency" text NOT NULL,
	"erased_at" timestamp with time zone,
	"refunded" bigint NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"stripe_subscription_id" text PRIMARY KEY,
	"user_id" text,
	"workspace_id" uuid
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
	"label" text,
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
CREATE TABLE "channels"."connect_links" (
	"browser_digest" text,
	"channel_id" uuid,
	"channel_ids" uuid[] NOT NULL,
	"connection" text,
	"created_at" timestamp with time zone NOT NULL,
	"created_by" text,
	"ended_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"id" uuid PRIMARY KEY,
	"locale" text,
	"platform" text NOT NULL,
	"return_url" text,
	"starts" integer NOT NULL,
	"status" text NOT NULL,
	"token_digest" text NOT NULL CONSTRAINT "connect_links_token" UNIQUE,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "connect_links_status" CHECK ("status" IN ('pending', 'completed', 'revoked')),
	CONSTRAINT "connect_links_ended" CHECK (("status" = 'pending') = ("ended_at" IS NULL)),
	CONSTRAINT "connect_links_starts" CHECK ("starts" >= 0)
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
CREATE TABLE "engagement"."comments" (
	"answered_at" timestamp with time zone,
	"author_display_name" text,
	"author_handle" text,
	"author_platform_id" text,
	"channel_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY,
	"liked" boolean DEFAULT false NOT NULL,
	"parent_platform_id" text,
	"permalink" text,
	"platform_comment_id" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"state" text NOT NULL,
	"text" text NOT NULL,
	"thread_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"written_at" timestamp with time zone NOT NULL,
	CONSTRAINT "comments_state" CHECK ("state" IN ('new', 'answered', 'hidden', 'deleted')),
	CONSTRAINT "comments_deleted_forgotten" CHECK ("state" <> 'deleted' OR ("text" = '' AND "author_platform_id" IS NULL AND "author_handle" IS NULL AND "author_display_name" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "engagement"."erased_workspaces" (
	"erased_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE "engagement"."replies" (
	"attempted_at" timestamp with time zone,
	"author_id" uuid,
	"call_claimed_at" timestamp with time zone,
	"channel_id" uuid NOT NULL,
	"comment_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"key_digest" text,
	"permalink" text,
	"platform_comment_id" text,
	"reason" text,
	"settled_at" timestamp with time zone,
	"status" text NOT NULL,
	"text" text NOT NULL,
	"thread_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "replies_status" CHECK ("status" IN ('sending', 'sent', 'failed', 'unconfirmed', 'withdrawn')),
	CONSTRAINT "replies_settled" CHECK (("status" = 'sending') = ("settled_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "engagement"."threads" (
	"author_id" uuid,
	"channel_id" uuid NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"end_reason" text,
	"ended_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"last_collected_at" timestamp with time zone,
	"last_comment_at" timestamp with time zone,
	"next_collection_at" timestamp with time zone,
	"permalink" text,
	"platform_post_id" text NOT NULL,
	"post_id" uuid NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"target_id" uuid NOT NULL,
	"unanswered_count" integer DEFAULT 0 NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "threads_collection" CHECK (("next_collection_at" IS NULL) <> ("ended_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "legal"."connections" (
	"access" text NOT NULL,
	"api_key_id" text,
	"at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"ip_address" text,
	"protocol" text NOT NULL,
	"user_id" uuid,
	"workspace_id" uuid
);
--> statement-breakpoint
CREATE TABLE "legal"."disclosures" (
	"at" timestamp with time zone NOT NULL,
	"authority" text NOT NULL,
	"connections" integer NOT NULL,
	"covers" jsonb NOT NULL,
	"held" integer NOT NULL,
	"id" uuid PRIMARY KEY,
	"legal_basis" text NOT NULL,
	"reference" text NOT NULL,
	"since" timestamp with time zone,
	"staff_id" uuid NOT NULL,
	"subject" jsonb NOT NULL,
	"until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "legal"."identification_holds" (
	"closed_at" timestamp with time zone NOT NULL,
	"email" text NOT NULL,
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"sign_in_methods" jsonb DEFAULT '[]' NOT NULL,
	"stripe_customer_ids" jsonb DEFAULT '[]' NOT NULL,
	"user_id" uuid NOT NULL
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
	"page_count" integer,
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
	"email_comments" boolean DEFAULT false NOT NULL,
	"email_post_failed" boolean NOT NULL,
	"email_post_published" boolean NOT NULL,
	"email_post_review" boolean DEFAULT true NOT NULL,
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
CREATE TABLE "publishing"."channel_defaults" (
	"channel_id" uuid PRIMARY KEY,
	"options" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishing"."channel_sets" (
	"channel_ids" uuid[] NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"options" jsonb DEFAULT '[]' NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "channel_sets_workspace_name" UNIQUE("workspace_id","name_key")
);
--> statement-breakpoint
CREATE TABLE "publishing"."idempotency_keys" (
	"created_at" timestamp with time zone NOT NULL,
	"key_digest" text,
	"post_id" uuid NOT NULL,
	"request_digest" text NOT NULL,
	"workspace_id" uuid,
	CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY("workspace_id","key_digest")
);
--> statement-breakpoint
CREATE TABLE "publishing"."live_post_changes" (
	"already_gone" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"call_finished_at" timestamp with time zone,
	"call_started_at" timestamp with time zone,
	"channel_id" uuid NOT NULL,
	"failure_code" text,
	"finished_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"kind" text NOT NULL,
	"parts_left" jsonb NOT NULL,
	"post_id" uuid NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"requested_by" uuid,
	"requested_via" jsonb,
	"status" text NOT NULL,
	"target_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishing"."post_targets" (
	"cancel_requested" boolean DEFAULT false NOT NULL,
	"channel_id" uuid NOT NULL,
	"content_digest" text,
	"failure_code" text,
	"failure_reason" text,
	"finished_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"kept_private" boolean DEFAULT false NOT NULL,
	"listed_at" timestamp with time zone,
	"live_parts" jsonb DEFAULT '[]' NOT NULL,
	"options" jsonb,
	"permalink" text,
	"platform_post_id" text,
	"post_id" uuid NOT NULL,
	"removed_at" timestamp with time zone,
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
	"created_via" jsonb,
	"execution_id" text,
	"finished_at" timestamp with time zone,
	"follow_ups" jsonb DEFAULT '[]' NOT NULL,
	"id" uuid PRIMARY KEY,
	"media" jsonb DEFAULT '[]' NOT NULL,
	"outcome" text,
	"queue_id" uuid,
	"schedule_revision" integer DEFAULT 0 NOT NULL,
	"schedule_zone" text,
	"scheduled_at" timestamp with time zone,
	"scheduled_by" uuid,
	"scheduled_via" jsonb,
	"started_at" timestamp with time zone,
	"status" text NOT NULL,
	"tag_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
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
	"part" integer DEFAULT 0,
	"retry_delay_millis" integer,
	"round" integer,
	"started_at" timestamp with time zone NOT NULL,
	"target_id" uuid,
	CONSTRAINT "publication_attempts_pkey" PRIMARY KEY("target_id","round","part","attempt")
);
--> statement-breakpoint
CREATE TABLE "publishing"."publication_calls" (
	"attempt" integer NOT NULL,
	"finished_at" timestamp with time zone,
	"idempotency_key" text PRIMARY KEY,
	"operation" text NOT NULL,
	"outcome" jsonb,
	"part" integer DEFAULT 0 NOT NULL,
	"progress" jsonb,
	"round" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"target_id" uuid NOT NULL,
	CONSTRAINT "publication_calls_target_round_part_attempt" UNIQUE("target_id","round","part","attempt")
);
--> statement-breakpoint
CREATE TABLE "publishing"."queues" (
	"channel_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"channel_set_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"is_default" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"slots" jsonb DEFAULT '[]' NOT NULL,
	"time_zone" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "queues_workspace_name" UNIQUE("workspace_id","name_key")
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
CREATE TABLE "publishing"."signatures" (
	"created_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"is_default" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"scope" text NOT NULL,
	"scope_channel_id" uuid,
	"scope_platform" text,
	"text" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "signatures_workspace_name" UNIQUE("workspace_id","name_key")
);
--> statement-breakpoint
CREATE TABLE "publishing"."tags" (
	"colour" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "tags_workspace_name" UNIQUE("workspace_id","name_key")
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
CREATE TABLE "review"."approval_requests" (
	"decided_at" timestamp with time zone,
	"decided_by_kind" text,
	"decided_by_link_id" uuid,
	"decided_by_name" text,
	"decided_by_user_id" uuid,
	"id" uuid PRIMARY KEY,
	"post_id" uuid NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"requested_by" uuid,
	"requested_via" text NOT NULL,
	"schedule_zone" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"subject_hash" text NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review"."comments" (
	"anchor_channel_id" uuid,
	"anchor_quote" text,
	"anchor_start" integer,
	"author_kind" text NOT NULL,
	"author_link_id" uuid,
	"author_user_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"parent_id" uuid,
	"post_id" uuid NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_kind" text,
	"resolved_by_user_id" uuid,
	"visitor_name" text,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review"."links" (
	"access" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"post_id" uuid NOT NULL,
	"revoked_at" timestamp with time zone,
	"token_hash" text NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review"."settings" (
	"approval_policy" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"updated_by" uuid,
	"workspace_id" uuid PRIMARY KEY
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
	"target_pseudonym" text,
	"workspace_id" uuid
);
--> statement-breakpoint
CREATE TABLE "webhooks"."deliveries" (
	"attempt_error" text,
	"attempts" integer NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"duration_ms" integer,
	"endpoint_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"failure_reason" text,
	"id" uuid PRIMARY KEY,
	"last_attempt_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"redelivery_of" uuid,
	"response_excerpt" text,
	"response_status" integer,
	"status" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "deliveries_status" CHECK ("status" IN ('pending', 'succeeded', 'failed')),
	CONSTRAINT "deliveries_attempts" CHECK ("attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webhooks"."endpoints" (
	"channel_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"description" text NOT NULL,
	"disabled_at" timestamp with time zone,
	"disabled_reason" text,
	"event_types" text[] NOT NULL,
	"failing_since" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"previous_secret" text,
	"previous_secret_expires_at" timestamp with time zone,
	"scope" text DEFAULT 'workspace' NOT NULL,
	"secret" text NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"url" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"workspace_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	CONSTRAINT "endpoints_status" CHECK ("status" IN ('enabled', 'disabled')),
	CONSTRAINT "endpoints_scope" CHECK ("scope" IN ('workspace', 'partner')),
	CONSTRAINT "endpoints_disabled" CHECK (("status" = 'disabled') = ("disabled_reason" IS NOT NULL AND "disabled_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "webhooks"."events" (
	"data" jsonb NOT NULL,
	"external_id" text,
	"id" uuid PRIMARY KEY,
	"key" text NOT NULL CONSTRAINT "events_key" UNIQUE,
	"occurred_at" timestamp with time zone NOT NULL,
	"sample" boolean DEFAULT false NOT NULL,
	"type" text NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks"."manual_sends" (
	"kind" text,
	"sent" integer NOT NULL,
	"window_start" timestamp with time zone,
	"workspace_id" uuid,
	CONSTRAINT "manual_sends_pkey" PRIMARY KEY("workspace_id","kind","window_start"),
	CONSTRAINT "manual_sends_kind" CHECK ("kind" IN ('single', 'bulk')),
	CONSTRAINT "manual_sends_sent" CHECK ("sent" > 0)
);
--> statement-breakpoint
CREATE TABLE "workspace"."partner_idempotency_keys" (
	"created_at" timestamp with time zone NOT NULL,
	"key_digest" text,
	"partner_id" uuid,
	"request_digest" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "partner_idempotency_keys_pkey" PRIMARY KEY("partner_id","key_digest")
);
--> statement-breakpoint
CREATE TABLE "workspace"."partner_keys" (
	"created_at" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"expires_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"key_digest" text NOT NULL CONSTRAINT "partner_keys_digest" UNIQUE,
	"name" text NOT NULL,
	"partner_id" uuid NOT NULL,
	"permissions" text[] NOT NULL,
	"scopes" text[] NOT NULL,
	"start" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace"."partner_usage_days" (
	"channels" integer NOT NULL,
	"day" date,
	"partner_id" uuid,
	"workspaces" integer NOT NULL,
	CONSTRAINT "partner_usage_days_pkey" PRIMARY KEY("partner_id","day"),
	CONSTRAINT "partner_usage_days_counts" CHECK ("channels" >= 0 AND "workspaces" >= 0)
);
--> statement-breakpoint
CREATE TABLE "workspace"."partner_workspaces" (
	"created_at" timestamp with time zone NOT NULL,
	"external_id" text,
	"partner_id" uuid NOT NULL,
	"workspace_id" uuid PRIMARY KEY,
	CONSTRAINT "partner_workspaces_external_id" UNIQUE("partner_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "workspace"."partners" (
	"created_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"logo_url" text,
	"name" text NOT NULL,
	"return_origins" text[] NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid NOT NULL CONSTRAINT "partners_workspace" UNIQUE
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
CREATE INDEX "events_workspace" ON "activity"."events" ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "events_occurred_at" ON "activity"."events" ("occurred_at");--> statement-breakpoint
CREATE INDEX "events_user" ON "activity"."events" ("user_id");--> statement-breakpoint
CREATE INDEX "request_counts_window_start" ON "activity"."request_counts" ("window_start");--> statement-breakpoint
CREATE INDEX "accounts_grant" ON "ads"."accounts" ("grant_id");--> statement-breakpoint
CREATE INDEX "accounts_due" ON "ads"."accounts" ("next_sync_at","id");--> statement-breakpoint
CREATE INDEX "ad_sets_campaign" ON "ads"."ad_sets" ("account_id","campaign_external_id");--> statement-breakpoint
CREATE INDEX "ad_sets_workspace" ON "ads"."ad_sets" ("workspace_id");--> statement-breakpoint
CREATE INDEX "ads_campaign" ON "ads"."ads" ("account_id","campaign_external_id");--> statement-breakpoint
CREATE INDEX "ads_post" ON "ads"."ads" ("workspace_id","post_id");--> statement-breakpoint
CREATE INDEX "ads_workspace" ON "ads"."ads" ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_events_workspace" ON "ads"."audit_events" ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "audit_events_by" ON "ads"."audit_events" ("by_id");--> statement-breakpoint
CREATE INDEX "audit_events_at" ON "ads"."audit_events" ("at");--> statement-breakpoint
CREATE INDEX "boosts_workspace" ON "ads"."boosts" ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "boosts_post" ON "ads"."boosts" ("workspace_id","post_id");--> statement-breakpoint
CREATE INDEX "boosts_account" ON "ads"."boosts" ("account_id","state");--> statement-breakpoint
CREATE INDEX "boosts_network_account" ON "ads"."boosts" ("workspace_id","account_network","account_external_id");--> statement-breakpoint
CREATE INDEX "boosts_ending" ON "ads"."boosts" ("ends_at");--> statement-breakpoint
CREATE INDEX "campaigns_workspace" ON "ads"."campaigns" ("workspace_id");--> statement-breakpoint
CREATE INDEX "grants_platform_user" ON "ads"."grants" ("network","platform_user_id");--> statement-breakpoint
CREATE INDEX "grants_granted_by" ON "ads"."grants" ("granted_by");--> statement-breakpoint
CREATE INDEX "insight_days_workspace_day" ON "ads"."insight_days" ("workspace_id","day");--> statement-breakpoint
CREATE INDEX "insight_days_day" ON "ads"."insight_days" ("day");--> statement-breakpoint
CREATE INDEX "sign_in_attempts_expiry" ON "ads"."sign_in_attempts" ("expires_at");--> statement-breakpoint
CREATE INDEX "sign_in_attempts_workspace" ON "ads"."sign_in_attempts" ("workspace_id");--> statement-breakpoint
CREATE INDEX "sign_in_attempts_started_by" ON "ads"."sign_in_attempts" ("started_by");--> statement-breakpoint
CREATE INDEX "spend_calls_boost" ON "ads"."spend_calls" ("boost_id","id");--> statement-breakpoint
CREATE INDEX "spend_calls_workspace" ON "ads"."spend_calls" ("workspace_id");--> statement-breakpoint
CREATE INDEX "paid_reads_day" ON "analytics"."paid_reads" ("day");--> statement-breakpoint
CREATE INDEX "tracked_channels_due" ON "analytics"."tracked_channels" ("next_collection_at","channel_id") WHERE "gone_at" IS NULL;--> statement-breakpoint
CREATE INDEX "tracked_channels_workspace" ON "analytics"."tracked_channels" ("workspace_id");--> statement-breakpoint
CREATE INDEX "tracked_posts_due" ON "analytics"."tracked_posts" ("next_collection_at","channel_id") WHERE "next_collection_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "tracked_posts_channel_due" ON "analytics"."tracked_posts" ("channel_id","next_collection_at","target_id") WHERE "next_collection_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "tracked_posts_workspace_published" ON "analytics"."tracked_posts" ("workspace_id","published_at");--> statement-breakpoint
CREATE INDEX "tracked_posts_post" ON "analytics"."tracked_posts" ("post_id");--> statement-breakpoint
CREATE INDEX "tracked_posts_published" ON "analytics"."tracked_posts" ("published_at","target_id");--> statement-breakpoint
CREATE INDEX "contract_references_workspace" ON "billing"."contract_references" ("workspace_id");--> statement-breakpoint
CREATE INDEX "contract_requests_workspace" ON "billing"."contract_requests" ("workspace_id");--> statement-breakpoint
CREATE INDEX "contract_requests_user" ON "billing"."contract_requests" ("user_id");--> statement-breakpoint
CREATE INDEX "contract_requests_status" ON "billing"."contract_requests" ("status","received_at");--> statement-breakpoint
CREATE INDEX "contract_requests_email" ON "billing"."contract_requests" ("email","acknowledged_at");--> statement-breakpoint
CREATE INDEX "contract_requests_erased" ON "billing"."contract_requests" ("erased_at");--> statement-breakpoint
CREATE UNIQUE INDEX "contract_requests_confirmation" ON "billing"."contract_requests" ("confirmation_digest");--> statement-breakpoint
CREATE INDEX "orders_workspace" ON "billing"."orders" ("workspace_id");--> statement-breakpoint
CREATE INDEX "orders_user" ON "billing"."orders" ("user_id");--> statement-breakpoint
CREATE INDEX "orders_erased" ON "billing"."orders" ("erased_at");--> statement-breakpoint
CREATE INDEX "subscriptions_workspace" ON "billing"."subscriptions" ("workspace_id");--> statement-breakpoint
CREATE INDEX "subscriptions_reminders" ON "billing"."subscriptions" ("status","current_period_end");--> statement-breakpoint
CREATE INDEX "trials_pseudonym" ON "billing"."trials" ("user_pseudonym");--> statement-breakpoint
CREATE UNIQUE INDEX "trials_subscription" ON "billing"."trials" ("stripe_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trials_user" ON "billing"."trials" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trials_workspace" ON "billing"."trials" ("workspace_id");--> statement-breakpoint
CREATE INDEX "usage_days_day" ON "billing"."usage_days" ("day");--> statement-breakpoint
CREATE INDEX "withdrawals_workspace" ON "billing"."withdrawals" ("workspace_id");--> statement-breakpoint
CREATE INDEX "withdrawals_user" ON "billing"."withdrawals" ("user_id");--> statement-breakpoint
CREATE INDEX "withdrawals_erased" ON "billing"."withdrawals" ("erased_at");--> statement-breakpoint
CREATE INDEX "channels_token_expiry" ON "channels"."channels" ("token_expires_at") WHERE "status" = 'active' AND "token_kind" <> 'nonExpiring';--> statement-breakpoint
CREATE INDEX "channels_granted_by" ON "channels"."channels" ("granted_by") WHERE "granted_by" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "connect_attempts_expires_at" ON "channels"."connect_attempts" ("expires_at");--> statement-breakpoint
CREATE INDEX "connect_choices_expires_at" ON "channels"."connect_choices" ("expires_at");--> statement-breakpoint
CREATE INDEX "connect_choices_granted_by" ON "channels"."connect_choices" ("granted_by") WHERE "granted_by" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "connect_links_workspace" ON "channels"."connect_links" ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "connect_links_expires_at" ON "channels"."connect_links" ("expires_at");--> statement-breakpoint
CREATE INDEX "connect_links_created_by" ON "channels"."connect_links" ("created_by") WHERE "created_by" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "comments_platform_id" ON "engagement"."comments" ("thread_id","platform_comment_id");--> statement-breakpoint
CREATE INDEX "comments_thread_written" ON "engagement"."comments" ("thread_id","written_at");--> statement-breakpoint
CREATE INDEX "replies_thread" ON "engagement"."replies" ("thread_id","id");--> statement-breakpoint
CREATE INDEX "replies_comment" ON "engagement"."replies" ("comment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "replies_pending_comment" ON "engagement"."replies" ("comment_id") WHERE "status" IN ('sending', 'unconfirmed');--> statement-breakpoint
CREATE UNIQUE INDEX "replies_key" ON "engagement"."replies" ("workspace_id","key_digest") WHERE "key_digest" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "replies_sending" ON "engagement"."replies" ("created_at","id") WHERE "status" = 'sending';--> statement-breakpoint
CREATE INDEX "replies_author" ON "engagement"."replies" ("author_id") WHERE "author_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "threads_target" ON "engagement"."threads" ("target_id");--> statement-breakpoint
CREATE INDEX "threads_due" ON "engagement"."threads" ("next_collection_at","channel_id") WHERE "next_collection_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "threads_channel_due" ON "engagement"."threads" ("channel_id","next_collection_at","id") WHERE "next_collection_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "threads_workspace_listed" ON "engagement"."threads" ("workspace_id","last_comment_at","id") WHERE "comment_count" > 0;--> statement-breakpoint
CREATE INDEX "threads_post" ON "engagement"."threads" ("post_id");--> statement-breakpoint
CREATE INDEX "threads_author" ON "engagement"."threads" ("author_id") WHERE "author_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "threads_published" ON "engagement"."threads" ("published_at","target_id");--> statement-breakpoint
CREATE INDEX "threads_ended" ON "engagement"."threads" ("ended_at") WHERE "ended_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "connections_at" ON "legal"."connections" ("at");--> statement-breakpoint
CREATE INDEX "connections_user" ON "legal"."connections" ("user_id","at");--> statement-breakpoint
CREATE INDEX "connections_workspace" ON "legal"."connections" ("workspace_id","at");--> statement-breakpoint
CREATE INDEX "disclosures_at" ON "legal"."disclosures" ("at");--> statement-breakpoint
CREATE INDEX "identification_holds_closed_at" ON "legal"."identification_holds" ("closed_at");--> statement-breakpoint
CREATE INDEX "identification_holds_user" ON "legal"."identification_holds" ("user_id");--> statement-breakpoint
CREATE INDEX "media_assets_workspace_id_id_index" ON "media"."media_assets" ("workspace_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notices_user" ON "notifications"."notices" ("user_id","id");--> statement-breakpoint
CREATE INDEX "notices_user_unread" ON "notifications"."notices" ("user_id") WHERE "read_at" IS NULL;--> statement-breakpoint
CREATE INDEX "channel_defaults_workspace" ON "publishing"."channel_defaults" ("workspace_id");--> statement-breakpoint
CREATE INDEX "idempotency_keys_created_at" ON "publishing"."idempotency_keys" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "live_post_changes_pending" ON "publishing"."live_post_changes" ("target_id") WHERE "status" = 'pending';--> statement-breakpoint
CREATE INDEX "live_post_changes_post" ON "publishing"."live_post_changes" ("workspace_id","post_id","id");--> statement-breakpoint
CREATE INDEX "live_post_changes_target" ON "publishing"."live_post_changes" ("target_id","id");--> statement-breakpoint
CREATE INDEX "post_targets_channel_content" ON "publishing"."post_targets" ("channel_id","content_digest") WHERE "content_digest" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "post_targets_published" ON "publishing"."post_targets" ("listed_at","id") WHERE "status" = 'published';--> statement-breakpoint
CREATE INDEX "posts_tag_ids" ON "publishing"."posts" USING gin ("tag_ids");--> statement-breakpoint
CREATE INDEX "posts_workspace_scheduled_at" ON "publishing"."posts" ("workspace_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "posts_scheduled" ON "publishing"."posts" ("scheduled_at") WHERE "status" = 'scheduled';--> statement-breakpoint
CREATE INDEX "posts_workspace_id" ON "publishing"."posts" ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "posts_workspace_drafts" ON "publishing"."posts" ("workspace_id","id") WHERE "status" = 'draft';--> statement-breakpoint
CREATE INDEX "posts_queue_scheduled_at" ON "publishing"."posts" ("queue_id","scheduled_at") WHERE "queue_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "queues_workspace_default" ON "publishing"."queues" ("workspace_id") WHERE "is_default";--> statement-breakpoint
CREATE INDEX "queues_workspace_id" ON "publishing"."queues" ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "approval_requests_pending" ON "review"."approval_requests" ("post_id") WHERE "status" = 'pending';--> statement-breakpoint
CREATE INDEX "approval_requests_post" ON "review"."approval_requests" ("post_id","id");--> statement-breakpoint
CREATE INDEX "approval_requests_workspace" ON "review"."approval_requests" ("workspace_id","status","id");--> statement-breakpoint
CREATE INDEX "comments_post" ON "review"."comments" ("post_id","id");--> statement-breakpoint
CREATE INDEX "comments_workspace" ON "review"."comments" ("workspace_id");--> statement-breakpoint
CREATE INDEX "comments_author" ON "review"."comments" ("author_user_id");--> statement-breakpoint
CREATE INDEX "comments_link" ON "review"."comments" ("author_link_id");--> statement-breakpoint
CREATE UNIQUE INDEX "links_token_hash" ON "review"."links" ("token_hash");--> statement-breakpoint
CREATE INDEX "links_post" ON "review"."links" ("post_id");--> statement-breakpoint
CREATE INDEX "links_workspace" ON "review"."links" ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_events_pseudonym" ON "staff"."audit_events" ("target_pseudonym");--> statement-breakpoint
CREATE INDEX "audit_events_at" ON "staff"."audit_events" ("at","id");--> statement-breakpoint
CREATE INDEX "audit_events_target" ON "staff"."audit_events" ("target_id","at");--> statement-breakpoint
CREATE INDEX "audit_events_staff" ON "staff"."audit_events" ("staff_id");--> statement-breakpoint
CREATE INDEX "audit_events_workspace" ON "staff"."audit_events" ("workspace_id","at");--> statement-breakpoint
CREATE INDEX "deliveries_endpoint" ON "webhooks"."deliveries" ("endpoint_id","id");--> statement-breakpoint
CREATE INDEX "deliveries_event" ON "webhooks"."deliveries" ("event_id");--> statement-breakpoint
CREATE INDEX "deliveries_created" ON "webhooks"."deliveries" ("created_at");--> statement-breakpoint
CREATE INDEX "deliveries_workspace" ON "webhooks"."deliveries" ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "deliveries_endpoint_failed" ON "webhooks"."deliveries" ("endpoint_id","id") WHERE "status" = 'failed';--> statement-breakpoint
CREATE INDEX "endpoints_workspace" ON "webhooks"."endpoints" ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "events_workspace" ON "webhooks"."events" ("workspace_id");--> statement-breakpoint
CREATE INDEX "manual_sends_window_start" ON "webhooks"."manual_sends" ("window_start");--> statement-breakpoint
CREATE INDEX "partner_idempotency_keys_created" ON "workspace"."partner_idempotency_keys" ("created_at");--> statement-breakpoint
CREATE INDEX "partner_keys_partner" ON "workspace"."partner_keys" ("partner_id","id");--> statement-breakpoint
CREATE INDEX "partner_keys_created_by" ON "workspace"."partner_keys" ("created_by");--> statement-breakpoint
CREATE INDEX "partner_workspaces_partner" ON "workspace"."partner_workspaces" ("partner_id","created_at");--> statement-breakpoint
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
ALTER TABLE "ads"."accounts" ADD CONSTRAINT "accounts_grant_id_grants_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "ads"."grants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ads"."ad_sets" ADD CONSTRAINT "ad_sets_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ads"."accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ads"."ads" ADD CONSTRAINT "ads_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ads"."accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ads"."campaigns" ADD CONSTRAINT "campaigns_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ads"."accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ads"."insight_days" ADD CONSTRAINT "insight_days_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ads"."accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ads"."spend_calls" ADD CONSTRAINT "spend_calls_boost_id_boosts_id_fkey" FOREIGN KEY ("boost_id") REFERENCES "ads"."boosts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "analytics"."account_snapshots" ADD CONSTRAINT "account_snapshots_channel_id_tracked_channels_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "analytics"."tracked_channels"("channel_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "analytics"."metric_snapshots" ADD CONSTRAINT "metric_snapshots_target_id_tracked_posts_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "analytics"."tracked_posts"("target_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "engagement"."comments" ADD CONSTRAINT "comments_thread_id_threads_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "engagement"."threads"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "engagement"."replies" ADD CONSTRAINT "replies_comment_id_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "engagement"."comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "engagement"."replies" ADD CONSTRAINT "replies_thread_id_threads_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "engagement"."threads"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."live_post_changes" ADD CONSTRAINT "live_post_changes_target_id_post_targets_id_fkey" FOREIGN KEY ("target_id") REFERENCES "publishing"."post_targets"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."post_targets" ADD CONSTRAINT "post_targets_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "publishing"."posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."publication_attempts" ADD CONSTRAINT "publication_attempts_target_id_post_targets_id_fkey" FOREIGN KEY ("target_id") REFERENCES "publishing"."post_targets"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."publication_calls" ADD CONSTRAINT "publication_calls_target_id_post_targets_id_fkey" FOREIGN KEY ("target_id") REFERENCES "publishing"."post_targets"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."upload_sessions" ADD CONSTRAINT "upload_sessions_72ct0kRYe5re_fkey" FOREIGN KEY ("idempotency_key") REFERENCES "publishing"."publication_calls"("idempotency_key") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "webhooks"."deliveries" ADD CONSTRAINT "deliveries_endpoint_id_endpoints_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhooks"."endpoints"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "webhooks"."deliveries" ADD CONSTRAINT "deliveries_event_id_events_id_fkey" FOREIGN KEY ("event_id") REFERENCES "webhooks"."events"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace"."partner_idempotency_keys" ADD CONSTRAINT "partner_idempotency_keys_partner_id_partners_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "workspace"."partners"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace"."partner_keys" ADD CONSTRAINT "partner_keys_partner_id_partners_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "workspace"."partners"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace"."partner_usage_days" ADD CONSTRAINT "partner_usage_days_partner_id_partners_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "workspace"."partners"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace"."partner_workspaces" ADD CONSTRAINT "partner_workspaces_partner_id_partners_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "workspace"."partners"("id");--> statement-breakpoint
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