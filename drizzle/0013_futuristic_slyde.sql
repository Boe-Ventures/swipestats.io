CREATE TABLE "swipe_rank_source_mutation" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"data_provider" "DataProvider" NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" DROP CONSTRAINT "swipe_rank_entry_profile_id_swipe_rank_profile_id_fk";
--> statement-breakpoint
CREATE INDEX "swipe_rank_source_mutation_provider_idx" ON "swipe_rank_source_mutation" USING btree ("data_provider","id");--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" ADD CONSTRAINT "swipe_rank_entry_profile_id_swipe_rank_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."swipe_rank_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_rank_build" DROP COLUMN "requested_profile_ids";