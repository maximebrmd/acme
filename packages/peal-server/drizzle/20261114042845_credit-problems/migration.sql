CREATE TABLE "billing"."credit_problems" (
	"amount" integer NOT NULL,
	"code" text,
	"currency" text NOT NULL,
	"erased_at" timestamp with time zone,
	"key" text PRIMARY KEY,
	"kind" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"reason" text,
	"refund_id" text,
	"stripe_subscription_id" text,
	"workspace_id" uuid
);
--> statement-breakpoint
CREATE INDEX "credit_problems_occurred_at" ON "billing"."credit_problems" ("occurred_at");--> statement-breakpoint
CREATE INDEX "credit_problems_workspace" ON "billing"."credit_problems" ("workspace_id");