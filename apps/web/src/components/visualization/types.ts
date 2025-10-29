/**
 * Type definitions for survey visualization components.
 */

export type PlotType = 'vertical' | 'plan' | 'inclination' | 'azimuth';

export type DataSource = 'calculated' | 'interpolated';

/**
 * Survey data structure for plotting.
 */
export interface SurveyPlotData {
  md: number[];
  inc: number[];
  azi: number[];
  easting: number[];
  northing: number[];
  tvd: number[];
  dls?: number[];
  vertical_section?: number[];
  closure_distance?: number[];
  closure_direction?: number[];
  pointCount: number;
}

/**
 * API response for calculated survey.
 */
export interface CalculatedSurveyResponse {
  id: string;
  survey_data: {
    id: string;
    md_data: number[];
    inc_data: number[];
    azi_data: number[];
    row_count: number;
  };
  easting: number[];
  northing: number[];
  tvd: number[];
  dls: number[];
  build_rate: number[];
  turn_rate: number[];
  vertical_section: number[];
  closure_distance: number[];
  closure_direction: number[];
  vertical_section_azimuth: number;
  calculation_status: string;
  calculation_duration: number;
}

/**
 * API response for interpolated survey.
 */
export interface InterpolatedSurveyResponse {
  id: string;
  calculated_survey: string;
  resolution: number;
  md_interpolated: number[];
  inc_interpolated: number[];
  azi_interpolated: number[];
  easting_interpolated: number[];
  northing_interpolated: number[];
  tvd_interpolated: number[];
  dls_interpolated: number[];
  vertical_section_interpolated?: number[];
  closure_distance_interpolated?: number[];
  closure_direction_interpolated?: number[];
  interpolation_status: string;
  point_count: number;
  interpolation_duration: number;
  created_at: string;
}
