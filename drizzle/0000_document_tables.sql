CREATE SCHEMA "afrideal";
--> statement-breakpoint
CREATE TABLE "afrideal"."audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."brands" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."categories" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."customer_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."disputes" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."margin_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."orders" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."pricing_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."products" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."rfq_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."rfqs" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."runner_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."runners" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."settlements" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."supplier_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."supplier_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."supplier_payables" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."supplier_users" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afrideal"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
