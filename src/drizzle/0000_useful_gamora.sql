CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connect_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" uuid,
	"reject_reason" text,
	CONSTRAINT "applications_status_chk" CHECK ("applications"."status" IN ('pending', 'approved', 'rejected', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "binding_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_sub" text NOT NULL,
	"google_email" text NOT NULL,
	"attempted_no" text,
	"succeeded" boolean DEFAULT false NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certification_participants" (
	"certification_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "certification_participants_certification_id_user_id_pk" PRIMARY KEY("certification_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connect_id" uuid NOT NULL,
	"submitted_by" uuid NOT NULL,
	"activity_date" date NOT NULL,
	"activity_type" text DEFAULT 'offline' NOT NULL,
	"online_platform" text,
	"content" text NOT NULL,
	"photo_key" text NOT NULL,
	"photo_width" integer,
	"photo_height" integer,
	"cross_connect_id" uuid,
	"own_participant_count" smallint NOT NULL,
	"cross_participant_count" smallint,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"reject_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cert_review_chk" CHECK ("certifications"."review_status" IN ('pending', 'approved', 'rejected')),
	CONSTRAINT "cert_cross_chk" CHECK (("certifications"."cross_connect_id" IS NULL AND "certifications"."cross_participant_count" IS NULL) OR ("certifications"."cross_connect_id" IS NOT NULL AND "certifications"."cross_participant_count" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "connect_tags" (
	"connect_id" uuid NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "connect_tags_connect_id_tag_id_pk" PRIMARY KEY("connect_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "connects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"track" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text,
	"campus" text NOT NULL,
	"location" text,
	"created_by" uuid NOT NULL,
	"contact" text,
	"capacity" smallint DEFAULT 6 NOT NULL,
	"available_days" smallint[] DEFAULT '{}' NOT NULL,
	"conditions" text[] DEFAULT '{}' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'recruiting' NOT NULL,
	"invite_token" text NOT NULL,
	"goal_type" text,
	"goal_detail" text,
	"goal_date" date,
	"activity_period" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"is_pre_created" boolean DEFAULT false NOT NULL,
	"confirmed_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connects_invite_token_unique" UNIQUE("invite_token"),
	CONSTRAINT "connects_status_chk" CHECK ("connects"."status" IN ('recruiting', 'full_closed', 'early_closed', 'private', 'pending_review', 'confirmed')),
	CONSTRAINT "connects_track_chk" CHECK ("connects"."track" IN ('quantitative', 'qualitative')),
	CONSTRAINT "connects_capacity_chk" CHECK ("connects"."capacity" BETWEEN 4 AND 7),
	CONSTRAINT "connects_qual_goal_chk" CHECK ("connects"."track" <> 'qualitative' OR ("connects"."goal_type" IS NOT NULL AND "connects"."goal_detail" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"connect_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_connect_id_pk" PRIMARY KEY("user_id","connect_id")
);
--> statement-breakpoint
CREATE TABLE "game_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_key" text NOT NULL,
	"score" integer NOT NULL,
	"is_valid" boolean DEFAULT true NOT NULL,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mbti_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type_code" text NOT NULL,
	"axis_scores" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connect_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "memberships_role_chk" CHECK ("memberships"."role" IN ('leader', 'member'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"channel" text DEFAULT 'push' NOT NULL,
	"delivery_status" text DEFAULT 'queued' NOT NULL,
	"error_detail" text,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_contest_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connect_id" uuid NOT NULL,
	"photo_key" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photo_contest_entries_connect_id_unique" UNIQUE("connect_id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "recommendation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"mode" text,
	"result_ids" uuid[],
	"is_fallback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roster" (
	"student_no" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cohort" integer NOT NULL,
	"campus" text NOT NULL,
	"slc" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connect_id" uuid NOT NULL,
	"certification_id" uuid,
	"event_type" text NOT NULL,
	"base_points" integer NOT NULL,
	"multiplier" numeric(3, 1) DEFAULT '1.0' NOT NULL,
	"final_points" integer NOT NULL,
	"week_start" date NOT NULL,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "score_event_type_chk" CHECK ("score_events"."event_type" IN ('base_activity', 'excess_activity', 'headcount_bonus', 'deliverable_bonus', 'cross_connect', 'exam_special', 'manual_adjustment'))
);
--> statement-breakpoint
CREATE TABLE "score_multiplier_windows" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"multiplier" numeric(3, 1) DEFAULT '1.0' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "season_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_suggested" boolean DEFAULT false NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_tags" (
	"user_id" uuid NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "user_tags_user_id_tag_id_pk" PRIMARY KEY("user_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_sub" text NOT NULL,
	"google_email" text NOT NULL,
	"google_hd" text,
	"student_no" text NOT NULL,
	"bound_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bound_ip" text,
	"role" text DEFAULT 'member' NOT NULL,
	"major" text,
	"available_times" text,
	"bio" text,
	"qualitative_intro" text,
	"mbti_type" text,
	"email_bounced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub"),
	CONSTRAINT "users_student_no_unique" UNIQUE("student_no"),
	CONSTRAINT "users_role_chk" CHECK ("users"."role" IN ('member', 'admin'))
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_connect_id_connects_id_fk" FOREIGN KEY ("connect_id") REFERENCES "public"."connects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certification_participants" ADD CONSTRAINT "certification_participants_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certification_participants" ADD CONSTRAINT "certification_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_connect_id_connects_id_fk" FOREIGN KEY ("connect_id") REFERENCES "public"."connects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_cross_connect_id_connects_id_fk" FOREIGN KEY ("cross_connect_id") REFERENCES "public"."connects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_tags" ADD CONSTRAINT "connect_tags_connect_id_connects_id_fk" FOREIGN KEY ("connect_id") REFERENCES "public"."connects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_tags" ADD CONSTRAINT "connect_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connects" ADD CONSTRAINT "connects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connects" ADD CONSTRAINT "connects_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_connect_id_connects_id_fk" FOREIGN KEY ("connect_id") REFERENCES "public"."connects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mbti_results" ADD CONSTRAINT "mbti_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_connect_id_connects_id_fk" FOREIGN KEY ("connect_id") REFERENCES "public"."connects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_contest_entries" ADD CONSTRAINT "photo_contest_entries_connect_id_connects_id_fk" FOREIGN KEY ("connect_id") REFERENCES "public"."connects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_logs" ADD CONSTRAINT "recommendation_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_connect_id_connects_id_fk" FOREIGN KEY ("connect_id") REFERENCES "public"."connects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_config" ADD CONSTRAINT "season_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_student_no_roster_student_no_fk" FOREIGN KEY ("student_no") REFERENCES "public"."roster"("student_no") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_time" ON "admin_audit_log" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_applications_active" ON "applications" USING btree ("connect_id","user_id") WHERE "applications"."status" IN ('pending', 'approved');--> statement-breakpoint
CREATE INDEX "idx_applications_connect" ON "applications" USING btree ("connect_id");--> statement-breakpoint
CREATE INDEX "idx_applications_user" ON "applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_binding_attempts" ON "binding_attempts" USING btree ("google_sub","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_cert_participants_user" ON "certification_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_cert_pending" ON "certifications" USING btree ("created_at") WHERE "certifications"."review_status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_cert_connect_date" ON "certifications" USING btree ("connect_id","activity_date");--> statement-breakpoint
CREATE INDEX "idx_connects_status" ON "connects" USING btree ("status") WHERE "connects"."is_public";--> statement-breakpoint
CREATE INDEX "idx_connects_track" ON "connects" USING btree ("track");--> statement-breakpoint
CREATE INDEX "idx_connects_creator" ON "connects" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_favorites_created" ON "favorites" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_game_scores_rank" ON "game_scores" USING btree ("game_key","score" DESC NULLS LAST) WHERE "game_scores"."is_valid";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_memberships_active" ON "memberships" USING btree ("connect_id","user_id") WHERE "memberships"."left_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_memberships_user" ON "memberships" USING btree ("user_id") WHERE "memberships"."left_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_memberships_leader" ON "memberships" USING btree ("connect_id") WHERE "memberships"."role" = 'leader' AND "memberships"."left_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_notifications_bounced" ON "notifications" USING btree ("user_id") WHERE "notifications"."delivery_status" = 'bounced';--> statement-breakpoint
CREATE INDEX "idx_photo_contest_order" ON "photo_contest_entries" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "idx_push_user" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reco_user_time" ON "recommendation_logs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_score_events_connect" ON "score_events" USING btree ("connect_id");--> statement-breakpoint
CREATE INDEX "idx_score_events_week" ON "score_events" USING btree ("week_start");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("google_email");--> statement-breakpoint
CREATE VIEW "public"."connect_scores" AS (SELECT c.id AS connect_id, c.name, COALESCE(SUM(se.final_points), 0) AS total_points
      FROM connects c
      LEFT JOIN score_events se ON se.connect_id = c.id
      GROUP BY c.id, c.name);