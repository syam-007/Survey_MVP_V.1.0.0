/**
 * Run Type Definitions
 * Based on Story 2.4 - Run Management Frontend Pages
 */

export type RunType = 'GTL' | 'Gyro' | 'MWD' | 'Unknown';

export interface RunLocation {
  latitude: number;
  longitude: number;
  easting: number;
  northing: number;
}

export interface RunDepth {
  elevation_reference: string;
  reference_height: number;
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

export interface Run {
  id: string;
  run_number: string;
  run_name: string;
  run_type: RunType;
  vertical_section: number | null;
  bhc_enabled: boolean;
  proposal_direction: number | null;
  grid_correction: number | null;
  well: RunWell | null;
  location: RunLocation | null;
  depth: RunDepth | null;
  user: RunUser;
  created_at: string;
  updated_at: string;
}

export interface CreateRunInput {
  run_number: string;
  run_name: string;
  run_type: RunType;
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
