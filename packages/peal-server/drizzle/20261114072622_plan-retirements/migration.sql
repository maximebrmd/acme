ALTER TABLE "billing"."subscriptions" ADD COLUMN "retires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing"."subscriptions" ADD COLUMN "retired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing"."subscriptions" ADD COLUMN "retirement_told_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing"."subscriptions" ADD COLUMN "retirement_requested_for" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing"."subscriptions" ADD COLUMN "retirement_paid_until" timestamp with time zone;