CREATE TABLE "billing"."x_usage_settings" (
	"reads" boolean DEFAULT false NOT NULL,
	"set_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid PRIMARY KEY
);
