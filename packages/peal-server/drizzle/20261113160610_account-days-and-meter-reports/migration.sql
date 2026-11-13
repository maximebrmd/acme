CREATE TABLE "billing"."account_days" (
	"day" date,
	"holder_workspace_id" uuid,
	"peak" integer NOT NULL,
	"reported" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "account_days_pkey" PRIMARY KEY("holder_workspace_id","day"),
	CONSTRAINT "account_days_counts" CHECK ("reported" >= 0 AND "reported" <= "peak")
);
--> statement-breakpoint
CREATE TABLE "billing"."meter_reports" (
	"created_at" timestamp with time zone NOT NULL,
	"event_name" text NOT NULL,
	"holder_workspace_id" uuid NOT NULL,
	"identifier" text PRIMARY KEY,
	"occurred_at" timestamp with time zone NOT NULL,
	"refusal" text,
	"sent_at" timestamp with time zone,
	"stripe_customer_id" text NOT NULL,
	"value" bigint NOT NULL,
	CONSTRAINT "meter_reports_value" CHECK ("value" > 0)
);
--> statement-breakpoint
ALTER TABLE "billing"."subscriptions" ADD COLUMN "paid_invoice_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "account_days_day" ON "billing"."account_days" ("day");--> statement-breakpoint
CREATE INDEX "meter_reports_unsent" ON "billing"."meter_reports" ("created_at") WHERE "sent_at" IS NULL;--> statement-breakpoint
CREATE INDEX "meter_reports_sent" ON "billing"."meter_reports" ("sent_at");--> statement-breakpoint
CREATE INDEX "meter_reports_holder" ON "billing"."meter_reports" ("holder_workspace_id");