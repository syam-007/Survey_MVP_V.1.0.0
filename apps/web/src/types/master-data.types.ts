/**
 * Master Data TypeScript types
 * For HoleSectionMaster, SurveyRunInMaster, and MinimumIdMaster
 */

export type SectionType = 'casing' | 'drill_pipe' | 'tubing';
export type RunInType = 'casing' | 'drill_pipe' | 'tubing';

/**
 * Hole Section Master Data
 */
export interface HoleSectionMaster {
  id: number;
  hole_section_name: string;
  section_type: SectionType;
  size_numeric: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Survey Run-In Master Data
 */
export interface SurveyRunInMaster {
  id: number;
  run_in_name: string;
  run_in_type: RunInType;
  size_numeric: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Minimum ID Master Data
 */
export interface MinimumIdMaster {
  id: number;
  minimum_id_name: string;
  size_numeric: number;
  survey_run_in: number; // FK to SurveyRunInMaster
  survey_run_in_name?: string; // Read-only display name
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
