CREATE TABLE "profile_roast" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"column_id" text,
	"comparison_id" text,
	"tone" text NOT NULL,
	"result" jsonb NOT NULL,
	"content_fingerprint" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_roast" ADD CONSTRAINT "profile_roast_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_roast" ADD CONSTRAINT "profile_roast_column_id_comparison_column_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."comparison_column"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_roast" ADD CONSTRAINT "profile_roast_comparison_id_profile_comparison_id_fk" FOREIGN KEY ("comparison_id") REFERENCES "public"."profile_comparison"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profile_roast_column_id_key" ON "profile_roast" USING btree ("column_id");--> statement-breakpoint
CREATE INDEX "profile_roast_comparison_id_idx" ON "profile_roast" USING btree ("comparison_id");--> statement-breakpoint
CREATE INDEX "profile_roast_user_id_idx" ON "profile_roast" USING btree ("user_id");