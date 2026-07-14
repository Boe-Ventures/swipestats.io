DROP INDEX "swipe_rank_snapshot_public_idx";--> statement-breakpoint
CREATE INDEX "swipe_rank_snapshot_status_idx" ON "swipe_rank_snapshot" USING btree ("status","period_kind","period_start");--> statement-breakpoint
ALTER TABLE "swipe_rank_snapshot" DROP COLUMN "is_public";