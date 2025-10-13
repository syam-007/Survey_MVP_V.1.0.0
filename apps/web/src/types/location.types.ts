/**
 * Location-related TypeScript types
 * Based on Story 3.1 - Location Information API Data Models
 */

export type GeodeticSystem = 'WGS84' | 'NAD83' | 'NAD27' | 'Other';
export type NorthReference = 'True North' | 'Magnetic North' | 'Grid North';

/**
 * Input data for creating a new location (user-provided fields)
 */
export interface CreateLocationInput {
  run: string; // UUID
  latitude: number;
  longitude: number;
  geodetic_system: GeodeticSystem;
  map_zone: string;
  north_reference: NorthReference;
  central_meridian: number;
}

/**
 * Complete location data including calculated fields
 */
export interface Location extends CreateLocationInput {
  id: string; // UUID
  easting: number; // Calculated
  northing: number; // Calculated
  grid_correction: number; // Calculated
  g_t: number; // Calculated
  w_t: number; // Calculated
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

/**
 * Input data for updating an existing location
 */
export interface UpdateLocationInput {
  latitude?: number;
  longitude?: number;
  geodetic_system?: GeodeticSystem;
  map_zone?: string;
  north_reference?: NorthReference;
  central_meridian?: number;
}
