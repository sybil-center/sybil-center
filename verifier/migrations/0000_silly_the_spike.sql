CREATE TABLE IF NOT EXISTS "sybil" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sybil_id" varchar(42) NOT NULL,
	"address" varchar(42) NOT NULL,
	"signature" varchar(132) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sybil_address_unique" UNIQUE("address")
);
