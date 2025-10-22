/**
 * Survey-related TypeScript types
 * Based on Story 3.3 - Survey Information API Data Models
 */

export type SurveyType = 'Minimum Curvature' | 'Balanced Tangential' | 'Average Angle' | 'Radius of Curvature';
export type SurveyStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Required columns for survey file validation
 */
export interface SurveyRequiredColumns {
  md: boolean;
  inc: boolean;
  azi: boolean;
}

/**
 * Input data for creating a new survey (user-provided fields)
 */
export interface CreateSurveyInput {
  run: string; // UUID
  survey_type: SurveyType;
  file_path?: string; // Optional - files are uploaded separately after run creation
  required_columns: SurveyRequiredColumns;
}

/**
 * Complete survey data including status and timestamps
 */
export interface Survey extends CreateSurveyInput {
  id: string; // UUID
  status: SurveyStatus;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

/**
 * Input data for updating an existing survey
 */
export interface UpdateSurveyInput {
  survey_type?: SurveyType;
  file_path?: string;
  required_columns?: SurveyRequiredColumns;
  status?: SurveyStatus;
}
