CREATE TABLE "swipe_rank_profile_ai_review" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"review_version" text NOT NULL,
	"model" text NOT NULL,
	"verdict" "SwipeRankAiReviewVerdict" NOT NULL,
	"confidence" double precision NOT NULL,
	"summary" text NOT NULL,
	"recommended_action" text NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"model_input_hash" text NOT NULL,
	"reviewed_by" text NOT NULL,
	"reviewed_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "swipe_rank_profile_ai_review_confidence" CHECK ("swipe_rank_profile_ai_review"."confidence" >= 0 AND "swipe_rank_profile_ai_review"."confidence" <= 1),
	CONSTRAINT "swipe_rank_profile_ai_review_text" CHECK (nullif(btrim("swipe_rank_profile_ai_review"."summary"), '') IS NOT NULL AND nullif(btrim("swipe_rank_profile_ai_review"."recommended_action"), '') IS NOT NULL AND nullif(btrim("swipe_rank_profile_ai_review"."reviewed_by"), '') IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "swipe_rank_profile_ai_review" ADD CONSTRAINT "swipe_rank_profile_ai_review_profile_id_swipe_rank_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."swipe_rank_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "swipe_rank_profile_ai_review_version_model_idx" ON "swipe_rank_profile_ai_review" USING btree ("profile_id","review_version","model");--> statement-breakpoint
CREATE INDEX "swipe_rank_profile_ai_review_queue_idx" ON "swipe_rank_profile_ai_review" USING btree ("verdict","reviewed_at");