CREATE TABLE IF NOT EXISTS "jal" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"program" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proving_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"jal_id" varchar(64) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proving_result" ADD CONSTRAINT "proving_result_jal_id_jal_id_fk" FOREIGN KEY ("jal_id") REFERENCES "public"."jal"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
