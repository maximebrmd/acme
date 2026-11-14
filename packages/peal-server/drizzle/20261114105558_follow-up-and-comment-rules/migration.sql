CREATE TABLE "engagement"."comment_rule_matches" (
	"code" text,
	"comment_id" uuid NOT NULL,
	"looked_at" timestamp with time zone NOT NULL,
	"outcome" text NOT NULL,
	"reply_id" uuid,
	"rule_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement"."comment_rules" (
	"answers_from" timestamp with time zone NOT NULL,
	"channel_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"ended_reason" text,
	"id" uuid PRIMARY KEY,
	"keywords" text[] NOT NULL,
	"post_id" uuid,
	"reply" text NOT NULL,
	"scope" text NOT NULL,
	"started_by" uuid,
	"started_via" jsonb NOT NULL,
	"status" text NOT NULL,
	"status_at" timestamp with time zone,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "comment_rules_scope" CHECK (("scope" = 'post' AND "post_id" IS NOT NULL AND "channel_id" IS NULL) OR ("scope" = 'channel' AND "channel_id" IS NOT NULL AND "post_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "publishing"."follow_up_rules" (
	"approval" jsonb NOT NULL,
	"channel_id" uuid,
	"comment" text,
	"created_at" timestamp with time zone NOT NULL,
	"ended_reason" text,
	"id" uuid PRIMARY KEY,
	"likes" integer NOT NULL,
	"post_id" uuid,
	"repost" boolean NOT NULL,
	"scope" text NOT NULL,
	"started_by" uuid,
	"started_via" jsonb NOT NULL,
	"status" text NOT NULL,
	"status_at" timestamp with time zone,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "follow_up_rules_scope" CHECK (("scope" = 'post' AND "post_id" IS NOT NULL AND "channel_id" IS NULL) OR ("scope" = 'channel' AND "channel_id" IS NOT NULL AND "post_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "publishing"."follow_ups" (
	"armed_at" timestamp with time zone NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"call_claimed_at" timestamp with time zone,
	"channel_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY,
	"kind" text NOT NULL,
	"post_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"state" jsonb NOT NULL,
	"status" text NOT NULL,
	"target_id" uuid NOT NULL,
	"triggered_at" timestamp with time zone,
	"until" timestamp with time zone,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "follow_ups_target_kind" UNIQUE("target_id","kind")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "comment_rule_matches_rule_comment" ON "engagement"."comment_rule_matches" ("rule_id","comment_id");--> statement-breakpoint
CREATE INDEX "comment_rule_matches_rule_looked" ON "engagement"."comment_rule_matches" ("rule_id","looked_at");--> statement-breakpoint
CREATE INDEX "comment_rule_matches_comment" ON "engagement"."comment_rule_matches" ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_rules_workspace_id" ON "engagement"."comment_rules" ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "comment_rules_active" ON "engagement"."comment_rules" ("id") WHERE "status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "follow_up_rules_post" ON "publishing"."follow_up_rules" ("post_id") WHERE "status" <> 'ended' AND "scope" = 'post';--> statement-breakpoint
CREATE UNIQUE INDEX "follow_up_rules_channel" ON "publishing"."follow_up_rules" ("channel_id") WHERE "status" <> 'ended' AND "scope" = 'channel';--> statement-breakpoint
CREATE INDEX "follow_up_rules_workspace_id" ON "publishing"."follow_up_rules" ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "follow_ups_armed" ON "publishing"."follow_ups" ("id") WHERE "status" = 'armed';--> statement-breakpoint
CREATE INDEX "follow_ups_channel_triggered" ON "publishing"."follow_ups" ("channel_id","triggered_at") WHERE "triggered_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "follow_ups_sending" ON "publishing"."follow_ups" ("triggered_at") WHERE "status" = 'sending';--> statement-breakpoint
CREATE INDEX "follow_ups_rule" ON "publishing"."follow_ups" ("rule_id","id");--> statement-breakpoint
ALTER TABLE "engagement"."comment_rule_matches" ADD CONSTRAINT "comment_rule_matches_comment_id_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "engagement"."comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "engagement"."comment_rule_matches" ADD CONSTRAINT "comment_rule_matches_rule_id_comment_rules_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "engagement"."comment_rules"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."follow_up_rules" ADD CONSTRAINT "follow_up_rules_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "publishing"."posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."follow_ups" ADD CONSTRAINT "follow_ups_rule_id_follow_up_rules_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "publishing"."follow_up_rules"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publishing"."follow_ups" ADD CONSTRAINT "follow_ups_target_id_post_targets_id_fkey" FOREIGN KEY ("target_id") REFERENCES "publishing"."post_targets"("id") ON DELETE CASCADE;