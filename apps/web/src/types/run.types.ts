/**
 * Run Type Definitions
 * Based on Story 2.4 - Run Management Frontend Pages
 */

export type SurveyType = 'GTL' | 'Gyro' | 'MWD' | 'Unknown';
export type RunType = 'Memory' | 'Surface Readout' | 'Dummy' | 'Test Stand';

export interface RunLocation {
  latitude: number;
  longitude: number;
  easting: number;
  northing: number;
  grid_correction?: number | null;
  w_t?: number | null;
  min_w_t?: number | null;
  max_w_t?: number | null;
  g_t?: number | null;
  min_g_t?: number | null;
  max_g_t?: number | null;
}

export interface RunDepth {
  elevation_reference: string;
  reference_height: number;
}

export interface RunTieOn {
  id: string;
  md: number;
  inc: number;
  azi: number;
  tvd: number;
  latitude: number;  // Northing (field named latitude for historical reasons)
  departure: number; // Easting (field named departure for historical reasons)
  well_type: string;
  is_bhc?: boolean;  // Bottom Hole Convergence flag
  proposal_direction?: number | null;  // Proposal direction (0-360 degrees)
}

export interface RunWell {
  id: string;
  well_name: string;
  well_type: string;
}

export interface RunUser {
  id: string;
  username: string;
  email: string;
}

export interface SurveyFile {
  id: string;
  filename: string;
  survey_type: SurveyType;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  upload_date: string;
  file_size: number;
  survey_data_id?: string;
}

export interface Run {
  id: string;
  run_number: string;
  run_name: string;
  survey_type: SurveyType;
  run_type: RunType | null;
  vertical_section: number | null;
  bhc_enabled: boolean;
  proposal_direction: number | null;
  grid_correction: number | null;
  well: RunWell | null;
  location: RunLocation | null;
  depth: RunDepth | null;
  tieon: RunTieOn | null;
  has_tieon: boolean; // Indicates if run has tie-on data (required for calculations)
  survey_files?: SurveyFile[];
  survey_files_count?: number;
  user: RunUser;
  created_at: string;
  updated_at: string;
}

export interface CreateRunInput {
  run_number: string;
  run_name: string;
  survey_type: SurveyType;
  run_type?: RunType | null;
  vertical_section?: number | null;
  bhc_enabled?: boolean;
  proposal_direction?: number | null;
  grid_correction?: number | null;
  well?: string | null; // UUID
  location?: RunLocation | null;
  depth?: RunDepth | null;
}

export interface UpdateRunInput extends Partial<CreateRunInput> {
  id: string;
}

export interface RunFilters {
  survey_type?: SurveyType;
  run_type?: RunType;
  well?: string; // UUID
  created_at_after?: string; // ISO 8601
  created_at_before?: string; // ISO 8601
  updated_at_after?: string; // ISO 8601
  updated_at_before?: string; // ISO 8601
  search?: string;
  ordering?: 'created_at' | '-created_at' | 'updated_at' | '-updated_at' | 'run_number' | '-run_number';
  page?: number;
  page_size?: number;
}

export interface PaginatedRunResponse {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  total_pages: number;
  page_size: number;
  results: Run[];
}
