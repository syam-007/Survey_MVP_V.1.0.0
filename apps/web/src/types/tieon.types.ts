/**
 * TieOn-related TypeScript types
 * Based on Story 3.4 - TieOn Information API Data Models
 */

export type WellType = 'Vertical' | 'Deviated' | 'Horizontal';
export type SurveyRunInType = 'casing' | 'drill_pipe' | 'tubing';

/**
 * Input data for creating a new tie-on (user-provided fields)
 */
export interface CreateTieOnInput {
  run: string; // UUID
  md: number;
  inc: number; // 0-180 degrees
  azi: number; // 0-360 degrees
  tvd: number;
  latitude: number;
  departure: number;
  well_type: WellType;
  survey_interval_from: number;
  survey_interval_to: number;
  // Master data fields
  hole_section_master?: number | null; // FK to HoleSectionMaster
  survey_run_in_type?: SurveyRunInType | null;
  survey_run_in?: number | null; // FK to SurveyRunInMaster
  minimum_id?: number | null; // FK to MinimumIdMaster
  // Auto-calculation fields
  expected_inclination?: number | null; // Used to auto-set well_type
}

/**
 * Complete tie-on data including calculated fields
 */
export interface TieOn extends CreateTieOnInput {
  id: string; // UUID
  survey_interval_length: number; // Calculated: survey_interval_to - survey_interval_from
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
  // Read-only display names for master data
  hole_section_master_name?: string;
  survey_run_in_name?: string;
  minimum_id_name?: string;
}

/**
 * Input data for updating an existing tie-on
 */
export interface UpdateTieOnInput {
  md?: number;
  inc?: number;
  azi?: number;
  tvd?: number;
  latitude?: number;
  departure?: number;
  well_type?: WellType;
  survey_interval_from?: number;
  survey_interval_to?: number;
  // Master data fields
  hole_section_master?: number | null;
  survey_run_in_type?: SurveyRunInType | null;
  survey_run_in?: number | null;
  minimum_id?: number | null;
  // Auto-calculation fields
  expected_inclination?: number | null;
}
