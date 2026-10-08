CREATE TABLE "afrideal"."payments" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."settings" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Spec 0003: a replayed gateway callback must be a no op at the database, not in
-- a read then write that two concurrent callbacks can both pass. Hand written
-- because `docTable()` declares no indexes and drizzle cannot express a partial
-- index over a jsonb expression cleanly.
--
-- Partial, so the many STARTED rows that have no provider reference yet do not
-- collide with each other on NULL.
CREATE UNIQUE INDEX "payments_provider_reference_unique"
  ON "afrideal"."payments" ((data->>'provider'), (data->>'provider_reference'))
  WHERE data->>'provider_reference' IS NOT NULL;
