CREATE SCHEMA "billing";
--> statement-breakpoint
CREATE TABLE "billing"."stripe_events" (
	"id" text PRIMARY KEY,
	"received_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."subscriptions" (
	"cancel_at_period_end" boolean NOT NULL,
	"current_period_end" timestamp with time zone,
	"last_event_at" timestamp with time zone NOT NULL,
	"last_event_id" text NOT NULL,
	"plan" text NOT NULL,
	"status" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text PRIMARY KEY,
	"updated_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid NOT NULL
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
ALTER TABLE "auth"."organization" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "auth"."user" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
CREATE INDEX "subscriptions_workspace" ON "billing"."subscriptions" ("workspace_id");