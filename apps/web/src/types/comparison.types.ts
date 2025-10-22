/**
 * Comparison and Delta Analysis Types
 *
 * Type definitions for survey comparison functionality including
 * delta calculations, statistics, and visualization data.
 */

export interface ComparisonStatistics {
  point_count: number;

  // Maximum deviations
  max_delta_x: number;
  max_delta_y: number;
  max_delta_z: number;
  max_delta_horizontal: number;
  max_delta_total: number;

  // Average deviations
  avg_delta_horizontal: number;
  avg_delta_total: number;
  avg_delta_x: number;
  avg_delta_y: number;
  avg_delta_z: number;

  // Standard deviations
  std_delta_horizontal: number;
  std_delta_total: number;

  // MD at maximum deviations
  md_at_max_horizontal: number;
  md_at_max_total: number;

  // Deviation at key depths
  deviation_at_start: {
    md: number;
    delta_horizontal: number;
    delta_total: number;
    delta_x: number;
    delta_y: number;
    delta_z: number;
  };
  deviation_at_25_percent: {
    md: number;
    delta_horizontal: number;
    delta_total: number;
  };
  deviation_at_50_percent: {
    md: number;
    delta_horizontal: number;
    delta_total: number;
  };
  deviation_at_75_percent: {
    md: number;
    delta_horizontal: number;
    delta_total: number;
  };
  deviation_at_end: {
    md: number;
    delta_horizontal: number;
    delta_total: number;
    delta_x: number;
    delta_y: number;
    delta_z: number;
  };

  // Angular statistics
  max_delta_inc: number;
  max_delta_azi: number;
  avg_delta_inc: number;
  avg_delta_azi: number;
  std_delta_inc: number;
  std_delta_azi: number;
}

export interface SurveyInfo {
  id: string;
  file_name: string;
  survey_type: string;
  row_count?: number;
}

export interface RunInfo {
  id: string;
  run_name: string;
  well_name: string;
}

export interface ComparisonResult {
  id: string;
  run: string;
  primary_survey: string;
  reference_survey: string;
  ratio_factor: number;

  // Delta data arrays
  md_data: number[];
  delta_x: number[];
  delta_y: number[];
  delta_z: number[];
  delta_horizontal: number[];
  delta_total: number[];
  delta_inc: number[];
  delta_azi: number[];

  // Reference survey full data
  reference_inc?: number[];
  reference_azi?: number[];
  reference_northing?: number[];
  reference_easting?: number[];
  reference_tvd?: number[];

  // Comparison survey full data
  comparison_inc?: number[];
  comparison_azi?: number[];
  comparison_northing?: number[];
  comparison_easting?: number[];
  comparison_tvd?: number[];

  // Metadata
  statistics: ComparisonStatistics;
  created_at: string;
  created_by: string;

  // Related info
  primary_survey_info: SurveyInfo;
  reference_survey_info: SurveyInfo;
  run_info: RunInfo;
  created_by_username: string;
}

export interface ComparisonListItem {
  id: string;
  run: string;
  primary_survey: string;
  reference_survey: string;
  ratio_factor: number;
  created_at: string;
  created_by_username: string;
  primary_survey_info: SurveyInfo;
  reference_survey_info: SurveyInfo;
  max_deviation: number;
  point_count: number;
}

export interface CreateComparisonRequest {
  run_id: string;
  primary_survey_id: string;
  reference_survey_id: string;
  ratio_factor?: number;
}

export interface ComparisonListResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: boolean;
  previous: boolean;
  results: ComparisonListItem[];
}

export interface ReferenceSurvey {
  id: string;
  file_name: string;
  file_size: number;
  survey_type: string;
  survey_role: string;
  processing_status: string;
  created_at: string;
  reference_for_survey: string | null;
  survey_data: {
    id: string;
    row_count: number;
    validation_status: string;
  } | null;
  calculated_survey: {
    id: string;
    calculation_status: string;
    point_count: number;
    calculation_duration: number | null;
  } | null;
  primary_survey: {
    id: string;
    file_name: string;
    survey_type: string;
  } | null;
}

export interface ReferenceListResponse {
  count: number;
  results: ReferenceSurvey[];
}
