ALTER TABLE "publishing"."follow_up_rules" ADD COLUMN "not_sent_told_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "publishing"."follow_ups" ADD COLUMN "notice_due" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "follow_ups_notice_due" ON "publishing"."follow_ups" ("rule_id") WHERE "notice_due";