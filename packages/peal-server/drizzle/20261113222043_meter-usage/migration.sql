CREATE TABLE "ads"."active_ad_months" (
	"ad_external_id" text,
	"month" date,
	"workspace_id" uuid,
	CONSTRAINT "active_ad_months_pkey" PRIMARY KEY("workspace_id","month","ad_external_id")
);
--> statement-breakpoint
CREATE TABLE "billing"."meter_usage" (
	"events" bigint DEFAULT 0 NOT NULL,
	"holder_workspace_id" uuid,
	"meter" text,
	"month" date,
	"reported" bigint DEFAULT 0 NOT NULL,
	"used" bigint NOT NULL,
	CONSTRAINT "meter_usage_pkey" PRIMARY KEY("holder_workspace_id","month","meter"),
	CONSTRAINT "meter_usage_counts" CHECK ("used" >= 0 AND "reported" >= 0 AND "events" >= 0)
);
--> statement-breakpoint
CREATE TABLE "billing"."spend_ceilings" (
	"cents" bigint NOT NULL,
	"currency" text NOT NULL,
	"group" text,
	"holder_workspace_id" uuid,
	"set_at" timestamp with time zone NOT NULL,
	CONSTRAINT "spend_ceilings_pkey" PRIMARY KEY("holder_workspace_id","group"),
	CONSTRAINT "spend_ceilings_cents" CHECK ("cents" >= 0)
);
--> statement-breakpoint
CREATE INDEX "active_ad_months_month" ON "ads"."active_ad_months" ("month");--> statement-breakpoint
CREATE INDEX "meter_usage_month" ON "billing"."meter_usage" ("month");--> statement-breakpoint
ALTER TABLE "billing"."meter_reports" DROP CONSTRAINT "meter_reports_value", ADD CONSTRAINT "meter_reports_value" CHECK ("value" <> 0);