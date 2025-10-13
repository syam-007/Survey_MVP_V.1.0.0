/**
 * TieOn-related TypeScript types
 * Based on Story 3.4 - TieOn Information API Data Models
 */

export type WellType = 'Vertical' | 'Deviated' | 'Horizontal';
export type HoleSection = 'Surface Casing' | 'Intermediate Casing' | 'Production Casing' | 'Liner' | 'Open Hole';
export type SurveyToolType = 'MWD' | 'LWD' | 'Wireline Gyro' | 'Steering Tool' | 'Other';

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
  hole_section: HoleSection;
  casing_selected: boolean;
  drillpipe_selected: boolean;
  survey_tool_type: SurveyToolType;
  survey_interval_from: number;
  survey_interval_to: number;
}

/**
 * Complete tie-on data including calculated fields
 */
export interface TieOn extends CreateTieOnInput {
  id: string; // UUID
  survey_interval_length: number; // Calculated: survey_interval_to - survey_interval_from
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
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
  hole_section?: HoleSection;
  casing_selected?: boolean;
  drillpipe_selected?: boolean;
  survey_tool_type?: SurveyToolType;
  survey_interval_from?: number;
  survey_interval_to?: number;
}
