CREATE TABLE IF NOT EXISTS "jal_comment" (
	"comment" varchar(400) NOT NULL,
	"client_id" varchar(300) NOT NULL,
	"jal_id" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data" jsonb NOT NULL,
	"client_id" varchar(256) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"jal_id" varchar(64) NOT NULL
);
--> statement-breakpoint
DROP TABLE "client";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jal_comment" ADD CONSTRAINT "jal_comment_jal_id_jal_id_fk" FOREIGN KEY ("jal_id") REFERENCES "public"."jal"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verification_result" ADD CONSTRAINT "verification_result_jal_id_jal_id_fk" FOREIGN KEY ("jal_id") REFERENCES "public"."jal"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
