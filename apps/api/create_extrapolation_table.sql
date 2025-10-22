BEGIN;
--
-- Create model Extrapolation
--
CREATE TABLE "extrapolations" ("id" uuid NOT NULL PRIMARY KEY, "extrapolation_length" double precision NOT NULL, "extrapolation_step" double precision NOT NULL, "interpolation_step" double precision NOT NULL, "extrapolation_method" varchar(20) NOT NULL, "original_md" jsonb NOT NULL, "original_inc" jsonb NOT NULL, "original_azi" jsonb NOT NULL, "original_north" jsonb NOT NULL, "original_east" jsonb NOT NULL, "original_tvd" jsonb NOT NULL, "interpolated_md" jsonb NOT NULL, "interpolated_inc" jsonb NOT NULL, "interpolated_azi" jsonb NOT NULL, "interpolated_north" jsonb NOT NULL, "interpolated_east" jsonb NOT NULL, "interpolated_tvd" jsonb NOT NULL, "extrapolated_md" jsonb NOT NULL, "extrapolated_inc" jsonb NOT NULL, "extrapolated_azi" jsonb NOT NULL, "extrapolated_north" jsonb NOT NULL, "extrapolated_east" jsonb NOT NULL, "extrapolated_tvd" jsonb NOT NULL, "combined_md" jsonb NOT NULL, "combined_inc" jsonb NOT NULL, "combined_azi" jsonb NOT NULL, "combined_north" jsonb NOT NULL, "combined_east" jsonb NOT NULL, "combined_tvd" jsonb NOT NULL, "original_point_count" integer NOT NULL, "interpolated_point_count" integer NOT NULL, "extrapolated_point_count" integer NOT NULL, "final_md" double precision NULL, "final_tvd" double precision NULL, "final_horizontal_displacement" double precision NULL, "created_at" timestamp with time zone NOT NULL, "updated_at" timestamp with time zone NOT NULL, "created_by_id" uuid NULL, "run_id" uuid NOT NULL, "survey_data_id" uuid NOT NULL);
ALTER TABLE "extrapolations" ADD CONSTRAINT "extrapolations_created_by_id_b4777464_fk_users_id" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "extrapolations" ADD CONSTRAINT "extrapolations_run_id_ef6d9612_fk_runs_id" FOREIGN KEY ("run_id") REFERENCES "runs" ("id") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "extrapolations" ADD CONSTRAINT "extrapolations_survey_data_id_4358f7d7_fk_survey_data_id" FOREIGN KEY ("survey_data_id") REFERENCES "survey_data" ("id") DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX "extrapolations_created_by_id_b4777464" ON "extrapolations" ("created_by_id");
CREATE INDEX "extrapolations_run_id_ef6d9612" ON "extrapolations" ("run_id");
CREATE INDEX "extrapolations_survey_data_id_4358f7d7" ON "extrapolations" ("survey_data_id");
CREATE INDEX "extrapolati_survey__35bec5_idx" ON "extrapolations" ("survey_data_id");
CREATE INDEX "extrapolati_run_id_5ebf5d_idx" ON "extrapolations" ("run_id");
CREATE INDEX "extrapolati_created_e4cad3_idx" ON "extrapolations" ("created_at");
COMMIT;
