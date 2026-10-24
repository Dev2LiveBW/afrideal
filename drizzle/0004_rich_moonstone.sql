CREATE TABLE "afrideal"."couriers" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
