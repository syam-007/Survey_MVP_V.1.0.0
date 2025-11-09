/**
 * TypeScript type definitions for Well Management
 * Based on Story 2.2 - Well Management API
 */

export interface RunSummary {
  id: string;
  run_number: string;
  run_name: string;
  run_type: 'GTL' | 'Gyro' | 'MWD' | 'Unknown';
}

export interface Location {
  id: string;
  latitude: number | null;
  longitude: number | null;
  latitude_degrees: number | null;
  latitude_minutes: number | null;
  latitude_seconds: number | null;
  longitude_degrees: number | null;
  longitude_minutes: number | null;
  longitude_seconds: number | null;
  easting: number | null;
  northing: number | null;
  geodetic_datum: string;
  geodetic_system: string;
  map_zone: string;
  north_reference: 'True North' | 'Grid North' | 'Magnetic North';
  central_meridian: number;
  grid_correction: number | null;
  w_t: number | null;
  min_w_t: number | null;
  max_w_t: number | null;
  g_t: number | null;
  min_g_t: number | null;
  max_g_t: number | null;
  north_coordinate: number | null;
  east_coordinate: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocationInput {
  latitude?: number | null;
  longitude?: number | null;
  latitude_degrees?: number | null;
  latitude_minutes?: number | null;
  latitude_seconds?: number | null;
  longitude_degrees?: number | null;
  longitude_minutes?: number | null;
  longitude_seconds?: number | null;
  easting?: number | null;
  northing?: number | null;
  geodetic_datum?: string;
  geodetic_system?: string;
  map_zone?: string;
  north_reference?: 'True North' | 'Grid North' | 'Magnetic North';
  central_meridian?: number;
}

export interface Well {
  id: string;
  well_id: string;
  well_name: string;
  location?: Location | null;
  job_count?: number;
  has_location?: boolean;
  runs_count: number;
  runs: RunSummary[];
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  created_by_name?: string | null;
}

export interface CreateWellInput {
  well_id: string;
  well_name: string;
  location: LocationInput;
}

export interface WellFilters {
  search?: string;
  ordering?: 'created_at' | '-created_at' | 'well_name' | '-well_name' | 'well_id' | '-well_id';
  page?: number;
  page_size?: number;
}

export interface PaginatedWellResponse {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  total_pages: number;
  page_size: number;
  results: Well[];
}
