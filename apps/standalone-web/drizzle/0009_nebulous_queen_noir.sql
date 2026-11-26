CREATE TABLE "inquiry" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"contact_email" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "inquiry_kind_created_idx" ON "inquiry" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "inquiry_contact_idx" ON "inquiry" USING btree ("contact_email");