ALTER TABLE "notifications"."notification_preferences" ADD COLUMN "email_weekly_digest" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications"."notification_preferences" ADD COLUMN "weekly_digest_week" date;--> statement-breakpoint
ALTER TABLE "notifications"."notification_preferences" ADD COLUMN "weekly_digest_lease" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications"."notification_preferences" ADD COLUMN "weekly_digest_links" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "notification_preferences_weekly_digest" ON "notifications"."notification_preferences" ("user_id") WHERE "email_weekly_digest";