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
CREATE UNIQUE INDEX "comment_rule_matches_rule_comment" ON "engagement"."comment_rule_matches" ("rule_id","comment_id");--> statement-breakpoint
CREATE INDEX "comment_rule_matches_rule_looked" ON "engagement"."comment_rule_matches" ("rule_id","looked_at");--> statement-breakpoint
CREATE INDEX "comment_rule_matches_comment" ON "engagement"."comment_rule_matches" ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_rules_workspace_id" ON "engagement"."comment_rules" ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "comment_rules_active" ON "engagement"."comment_rules" ("id") WHERE "status" = 'active';--> statement-breakpoint
ALTER TABLE "engagement"."comment_rule_matches" ADD CONSTRAINT "comment_rule_matches_comment_id_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "engagement"."comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "engagement"."comment_rule_matches" ADD CONSTRAINT "comment_rule_matches_rule_id_comment_rules_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "engagement"."comment_rules"("id") ON DELETE CASCADE;