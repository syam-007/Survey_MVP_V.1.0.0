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

export interface Well {
  id: string;
  well_id: string;
  well_name: string;
  runs_count: number;
  runs: RunSummary[];
  created_at: string;
  updated_at: string;
}

export interface CreateWellInput {
  well_id: string;
  well_name: string;
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
