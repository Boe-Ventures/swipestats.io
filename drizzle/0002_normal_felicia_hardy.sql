CREATE TABLE "roast" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tinder_profile_id" text,
	"hinge_profile_id" text,
	"roast_lines" jsonb NOT NULL,
	"real_talk_insights" jsonb NOT NULL,
	"headline" text NOT NULL,
	"overall_score" integer NOT NULL,
	"share_key" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "roast_shareKey_unique" UNIQUE("share_key")
);
--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "llm_analyzed_at" timestamp;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "original_url" text;--> statement-breakpoint
ALTER TABLE "tinder_profile" ADD COLUMN "llm_analyzed_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "languages" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "roast" ADD CONSTRAINT "roast_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roast" ADD CONSTRAINT "roast_tinder_profile_id_tinder_profile_tinder_id_fk" FOREIGN KEY ("tinder_profile_id") REFERENCES "public"."tinder_profile"("tinder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roast" ADD CONSTRAINT "roast_hinge_profile_id_hinge_profile_hinge_id_fk" FOREIGN KEY ("hinge_profile_id") REFERENCES "public"."hinge_profile"("hinge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "roast_user_id_idx" ON "roast" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "roast_tinder_profile_id_idx" ON "roast" USING btree ("tinder_profile_id");--> statement-breakpoint
CREATE INDEX "roast_hinge_profile_id_idx" ON "roast" USING btree ("hinge_profile_id");--> statement-breakpoint
CREATE INDEX "roast_share_key_idx" ON "roast" USING btree ("share_key");