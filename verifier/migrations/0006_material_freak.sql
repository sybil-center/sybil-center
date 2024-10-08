DO $$ BEGIN
 CREATE TYPE "public"."verification_result_status_enum" AS ENUM('success', 'exception');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "verification_result" ADD COLUMN "status" "verification_result_status_enum" NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_result" ADD COLUMN "subject_id" varchar(256) NOT NULL;