ALTER TABLE "certifications" RENAME COLUMN "photo_key" TO "photo_keys";--> statement-breakpoint
ALTER TABLE "certifications" ALTER COLUMN "activity_type" SET DEFAULT 'connect';--> statement-breakpoint
ALTER TABLE "certifications" ADD COLUMN "output_link" text;--> statement-breakpoint
ALTER TABLE "connects" ADD COLUMN "instagram" text;--> statement-breakpoint
ALTER TABLE "certifications" DROP COLUMN "photo_width";--> statement-breakpoint
ALTER TABLE "certifications" DROP COLUMN "photo_height";