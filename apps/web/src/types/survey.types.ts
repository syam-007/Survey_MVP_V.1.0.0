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
  survey_type?: SurveyType; // Optional - can be determined from uploaded file
  file_path?: string; // Optional - files are uploaded separately after run creation
  required_columns?: SurveyRequiredColumns; // Optional - determined from survey type
}

/**
 * Complete survey data including status and timestamps
 */
export interface Survey {
  id: string; // UUID
  run: string; // UUID
  survey_type?: SurveyType | null; // Optional - can be determined from uploaded file
  file_path?: string | null; // Optional - files are uploaded separately
  required_columns?: SurveyRequiredColumns; // Optional - determined from survey type
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

/**
 * QA Station data for GTL surveys
 */
export interface QAStation {
  index: number;
  md: number;
  inc: number;
  azi: number;
  g_t: number;
  w_t: number;
  g_t_difference: number;
  w_t_difference: number;
  g_t_status: 'high' | 'good' | 'low' | 'n/c';
  w_t_status: 'high' | 'good' | 'low' | 'n/c';
  overall_status: 'PASS' | 'REMOVE';
}

/**
 * QA Summary statistics
 */
export interface QASummary {
  total_stations: number;
  pass_count: number;
  remove_count: number;
  g_t_score: string;
  w_t_score: string;
  g_t_percentage: number;
  w_t_percentage: number;
  location_g_t: number;
  location_w_t: number;
}

/**
 * Complete QA data for a GTL survey
 */
export interface QAData {
  qa_id: string;
  file_name: string;
  status: 'pending' | 'approved' | 'rejected';
  summary: QASummary;
  stations: QAStation[];
}

/**
 * Survey data with QA information (for GTL surveys)
 */
export interface SurveyDataWithQA {
  id: string;
  created_at: string;
  validation_status: string;
  validation_errors: string[] | null;
  survey_file: {
    id: string;
    file_name: string;
    file_size: number;
    survey_type: string;
  };
  survey_data: {
    md_data: number[];
    inc_data: number[];
    azi_data: number[];
    wt_data: number[];
    gt_data: number[];
    row_count: number;
  };
  northing: number[];
  easting: number[];
  tvd: number[];
  dls: number[];
  build_rate: number[];
  turn_rate: number[];
  vertical_section: number[];
  closure_distance: number[];
  closure_direction: number[];
  vertical_section_azimuth: number | null;
  calculation_duration: number | null;
  calculation_status: string;
  survey_data_id?: string;
  qa_data: QAData | null;
}
