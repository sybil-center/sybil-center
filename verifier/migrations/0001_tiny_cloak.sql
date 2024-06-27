CREATE TABLE IF NOT EXISTS "client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" varchar(300) NOT NULL,
	"token_map" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "client_subject_id_unique" UNIQUE("subject_id")
);
