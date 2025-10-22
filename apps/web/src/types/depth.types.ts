/**
 * Depth-related TypeScript types
 * Based on Story 3.2 - Depth Information API Data Models
 */

export type ElevationReference = 'KB' | 'RT' | 'GL' | 'MSL' | 'DF' | 'RKB';

/**
 * Input data for creating new depth information (user-provided fields)
 */
export interface CreateDepthInput {
  run: string; // UUID
  well: string; // UUID
  elevation_reference: ElevationReference; // Defaults to "MSL" (Mean Sea Level)
  reference_datum?: string; // Defaults to "RKB/DFE(Drill Floor Elevation)" (read-only)
  reference_height: number;
  reference_elevation: number;
}

/**
 * Complete depth data including timestamps
 */
export interface Depth extends CreateDepthInput {
  id: string; // UUID
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

/**
 * Input data for updating existing depth information
 */
export interface UpdateDepthInput {
  elevation_reference?: ElevationReference;
  reference_datum?: string;
  reference_height?: number;
  reference_elevation?: number;
}
