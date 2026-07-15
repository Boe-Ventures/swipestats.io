ALTER TABLE "hinge_prompt" ALTER COLUMN "prompt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hinge_prompt" ADD COLUMN "provider_prompt_id" integer;