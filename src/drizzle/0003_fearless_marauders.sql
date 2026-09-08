ALTER TABLE "connects" DROP CONSTRAINT "connects_status_chk";--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "connects" ADD CONSTRAINT "connects_status_chk" CHECK ("connects"."status" IN ('recruiting', 'full_closed', 'early_closed', 'private', 'pending_review', 'rejected', 'confirmed'));