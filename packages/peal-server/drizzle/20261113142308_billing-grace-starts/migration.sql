CREATE TABLE "billing"."grace_starts" (
	"grace_until" date PRIMARY KEY,
	"started_at" timestamp with time zone NOT NULL
);
