CREATE TABLE "activity"."request_limits" (
	"requests_per_minute" integer NOT NULL,
	"set_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid PRIMARY KEY,
	CONSTRAINT "request_limits_requests_per_minute" CHECK ("requests_per_minute" > 0)
);
