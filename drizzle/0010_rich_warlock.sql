ALTER TABLE "swipe_rank_entry" DROP CONSTRAINT "swipe_rank_entry_profile_id_swipe_rank_profile_id_fk";
--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" ALTER COLUMN "profile_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" ADD CONSTRAINT "swipe_rank_entry_profile_id_swipe_rank_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."swipe_rank_profile"("id") ON DELETE set null ON UPDATE no action;