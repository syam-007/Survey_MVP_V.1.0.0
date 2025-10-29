/**
 * Location-related TypeScript types
 * Based on Story 3.1 - Location Information API Data Models
 */

export type GeodeticSystem = 'PSD 93' | 'WGS84' | 'NAD83' | 'NAD27' | 'Other';
export type NorthReference = 'True North' | 'Magnetic North' | 'Grid North';

/**
 * Input data for creating a new location (user-provided fields)
 */
export interface CreateLocationInput {
  run: string; // UUID
  latitude?: number;
  longitude?: number;
  // Latitude DMS components
  latitude_degrees?: number;
  latitude_minutes?: number;
  latitude_seconds?: number;
  // Longitude DMS components
  longitude_degrees?: number;
  longitude_minutes?: number;
  longitude_seconds?: number;
  // UTM coordinates (required)
  easting: number;
  northing: number;
  geodetic_datum?: string; // Optional, defaults to "PSD 93" (read-only)
  geodetic_system?: GeodeticSystem; // Optional, defaults to "Universal Transverse Mercator" (read-only)
  map_zone?: string; // Optional, defaults to "Zone 40N(54E to 60E)" (read-only)
  north_reference?: NorthReference; // Optional, defaults to "Grid North" (read-only)
  central_meridian: number;
}

/**
 * Complete location data including calculated fields
 */
export interface Location extends CreateLocationInput {
  id: string; // UUID
  well?: string; // UUID - optional well reference
  north_coordinate?: number; // Calculated from DMS
  east_coordinate?: number; // Calculated from DMS
  easting: number; // Calculated
  northing: number; // Calculated
  grid_correction: number; // Calculated
  w_t: number; // Scale factor (calculated)
  min_w_t: number; // Minimum scale factor (calculated)
  max_w_t: number; // Maximum scale factor (calculated)
  g_t: number; // Grid convergence (calculated)
  min_g_t: number; // Minimum grid convergence (calculated)
  max_g_t: number; // Maximum grid convergence (calculated)
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

/**
 * Input data for updating an existing location
 */
export interface UpdateLocationInput {
  latitude?: number;
  longitude?: number;
  latitude_degrees?: number;
  latitude_minutes?: number;
  latitude_seconds?: number;
  longitude_degrees?: number;
  longitude_minutes?: number;
  longitude_seconds?: number;
  easting?: number;
  northing?: number;
  geodetic_datum?: string;
  geodetic_system?: GeodeticSystem;
  map_zone?: string;
  north_reference?: NorthReference;
  central_meridian?: number;
}
