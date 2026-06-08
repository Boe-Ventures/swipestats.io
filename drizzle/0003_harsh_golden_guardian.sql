DROP INDEX "ai_output_subject_key";--> statement-breakpoint
ALTER TABLE "ai_output" ADD COLUMN "tinder_profile_id" text;--> statement-breakpoint
ALTER TABLE "ai_output" ADD COLUMN "hinge_profile_id" text;--> statement-breakpoint
ALTER TABLE "ai_output" ADD COLUMN "column_id" text;--> statement-breakpoint
ALTER TABLE "ai_output" ADD CONSTRAINT "ai_output_tinder_profile_id_tinder_profile_tinder_id_fk" FOREIGN KEY ("tinder_profile_id") REFERENCES "public"."tinder_profile"("tinder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_output" ADD CONSTRAINT "ai_output_hinge_profile_id_hinge_profile_hinge_id_fk" FOREIGN KEY ("hinge_profile_id") REFERENCES "public"."hinge_profile"("hinge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_output" ADD CONSTRAINT "ai_output_column_id_comparison_column_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."comparison_column"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_output_column_id_idx" ON "ai_output" USING btree ("column_id");--> statement-breakpoint
ALTER TABLE "ai_output" DROP COLUMN "subject_id";--> statement-breakpoint
ALTER TABLE "ai_output" ADD CONSTRAINT "ai_output_subject_key" UNIQUE NULLS NOT DISTINCT("kind","scope","tinder_profile_id","hinge_profile_id","column_id");--> statement-breakpoint
ALTER TABLE "ai_output" ADD CONSTRAINT "ai_output_one_subject" CHECK (num_nonnulls("ai_output"."tinder_profile_id", "ai_output"."hinge_profile_id", "ai_output"."column_id") = 1);