ALTER TABLE "swipe_rank_profile" ADD COLUMN "is_swipe_rank_excluded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "swipe_rank_profile" ADD COLUMN "swipe_rank_exclusion_reason" text;--> statement-breakpoint
ALTER TABLE "swipe_rank_profile" ADD COLUMN "swipe_rank_excluded_at" timestamp;--> statement-breakpoint
ALTER TABLE "swipe_rank_profile" ADD COLUMN "swipe_rank_excluded_by" text;--> statement-breakpoint
CREATE INDEX "swipe_rank_profile_exclusion_idx" ON "swipe_rank_profile" USING btree ("data_provider","is_swipe_rank_excluded");--> statement-breakpoint
ALTER TABLE "swipe_rank_profile" ADD CONSTRAINT "swipe_rank_profile_exclusion_state" CHECK ((
        "swipe_rank_profile"."is_swipe_rank_excluded" = false
        AND "swipe_rank_profile"."swipe_rank_exclusion_reason" IS NULL
        AND "swipe_rank_profile"."swipe_rank_excluded_at" IS NULL
        AND "swipe_rank_profile"."swipe_rank_excluded_by" IS NULL
      ) OR (
        "swipe_rank_profile"."is_swipe_rank_excluded" = true
        AND nullif(btrim("swipe_rank_profile"."swipe_rank_exclusion_reason"), '') IS NOT NULL
        AND "swipe_rank_profile"."swipe_rank_excluded_at" IS NOT NULL
        AND nullif(btrim("swipe_rank_profile"."swipe_rank_excluded_by"), '') IS NOT NULL
      ));