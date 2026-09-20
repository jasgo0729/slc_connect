ALTER TABLE "certifications" ADD COLUMN "is_social" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "certifications" ADD COLUMN "deliverable_score" smallint;