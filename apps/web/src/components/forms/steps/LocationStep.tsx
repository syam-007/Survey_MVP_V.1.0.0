import React, { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Typography,
  Alert,
  Box,
  Paper,
} from '@mui/material';
import { GridWrapper as Grid } from './GridWrapper';
import type { GeodeticSystem, NorthReference, CreateLocationInput } from '../../../types';

/**
 * Validation schema for Location step
 */
const locationSchema = yup.object({
  latitude: yup
    .number()
    .nullable()
    .min(-90, 'Latitude must be >= -90')
    .max(90, 'Latitude must be <= 90'),
  longitude: yup
    .number()
    .nullable()
    .min(-180, 'Longitude must be >= -180')
    .max(180, 'Longitude must be <= 180'),
  latitude_degrees: yup
    .number()
    .required('Latitude degrees is required')
    .min(-90, 'Degrees must be >= -90')
    .max(90, 'Degrees must be <= 90'),
  latitude_minutes: yup
    .number()
    .nullable()
    .min(0, 'Minutes must be >= 0')
    .max(59, 'Minutes must be <= 59'),
  latitude_seconds: yup
    .number()
    .nullable()
    .min(0, 'Seconds must be >= 0')
    .max(59.999, 'Seconds must be < 60'),
  longitude_degrees: yup
    .number()
    .required('Longitude degrees is required')
    .min(-180, 'Degrees must be >= -180')
    .max(180, 'Degrees must be <= 180'),
  longitude_minutes: yup
    .number()
    .nullable()
    .min(0, 'Minutes must be >= 0')
    .max(59, 'Minutes must be <= 59'),
  longitude_seconds: yup
    .number()
    .nullable()
    .min(0, 'Seconds must be >= 0')
    .max(59.999, 'Seconds must be < 60'),
  geodetic_datum: yup
    .string()
    .nullable(),
  geodetic_system: yup
    .mixed<GeodeticSystem>()
    .oneOf(['PSD 93', 'WGS84', 'NAD83', 'NAD27', 'Other'])
    .nullable(),
  map_zone: yup
    .string()
    .nullable()
    .max(100, 'Map zone cannot exceed 100 characters'),
  north_reference: yup
    .mixed<NorthReference>()
    .oneOf(['True North', 'Magnetic North', 'Grid North'])
    .nullable(),
  central_meridian: yup
    .number()
    .required('Central meridian is required')
    .min(-180, 'Central meridian must be >= -180')
    .max(180, 'Central meridian must be <= 180'),
});

export interface LocationStepProps {
  data: Partial<CreateLocationInput>;
  onChange: (data: Partial<CreateLocationInput>) => void;
  wellId?: string;
}

/**
 * LocationStep Component
 * Step 2 of the complete run creation workflow
 * Collects location information (lat/lon, geodetic system, etc.)
 * Based on Story 3.5 AC#2
 */
export const LocationStep: React.FC<LocationStepProps> = ({
  data,
  onChange,
  wellId,
}) => {
  const {
    control,
    watch,
    formState: { errors },
  } = useForm<Partial<CreateLocationInput>>({
    resolver: yupResolver(locationSchema) as any,
    defaultValues: {
      geodetic_datum: 'PSD 93', // Default to PSD 93 (read-only)
      geodetic_system: 'Universal Transverse Mercator', // Default to UTM (read-only)
      map_zone: 'Zone 40N(54E to 60E)', // Default to Zone 40N (read-only)
      north_reference: 'Grid North', // Default to Grid North (read-only)
      central_meridian: 57.0, // Default central meridian for Zone 40N
      ...data,
    },
    mode: 'onBlur',
  });

  // Watch all form fields and update parent on change
  const formData = watch();

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  // Calculate coordinates from DMS in real-time
  const northCoordinate = useMemo(() => {
    const degrees = formData.latitude_degrees;
    const minutes = formData.latitude_minutes || 0;
    const seconds = formData.latitude_seconds || 0;

    if (degrees === undefined || degrees === null) return null;

    const result = degrees + (((seconds / 60) + minutes) / 60);
    return parseFloat(result.toFixed(8));
  }, [formData.latitude_degrees, formData.latitude_minutes, formData.latitude_seconds]);

  const eastCoordinate = useMemo(() => {
    const degrees = formData.longitude_degrees;
    const minutes = formData.longitude_minutes || 0;
    const seconds = formData.longitude_seconds || 0;

    if (degrees === undefined || degrees === null) return null;

    const result = degrees + (((seconds / 60) + minutes) / 60);
    return parseFloat(result.toFixed(8));
  }, [formData.longitude_degrees, formData.longitude_minutes, formData.longitude_seconds]);

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Location Information
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Provide the geographic location coordinates and geodetic settings.
      </Typography>

      {wellId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Location can be auto-populated from the selected well if available.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Latitude DMS Section */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Latitude (Degrees, Minutes, Seconds)
          </Typography>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="latitude_degrees"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Degrees"
                fullWidth
                required
                error={!!errors.latitude_degrees}
                helperText={errors.latitude_degrees?.message || '(-90 to 90)'}
                placeholder="e.g., 29"
                inputProps={{ step: '1' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="latitude_minutes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Minutes"
                fullWidth
                error={!!errors.latitude_minutes}
                helperText={errors.latitude_minutes?.message || '(0 to 59)'}
                placeholder="e.g., 45"
                inputProps={{ step: '1' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="latitude_seconds"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Seconds"
                fullWidth
                error={!!errors.latitude_seconds}
                helperText={errors.latitude_seconds?.message || '(0.0 to 59.999)'}
                placeholder="e.g., 37.536"
                inputProps={{ step: '0.001' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        {/* Longitude DMS Section */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Longitude (Degrees, Minutes, Seconds)
          </Typography>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="longitude_degrees"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Degrees"
                fullWidth
                required
                error={!!errors.longitude_degrees}
                helperText={errors.longitude_degrees?.message || '(-180 to 180)'}
                placeholder="e.g., -95"
                inputProps={{ step: '1' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="longitude_minutes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Minutes"
                fullWidth
                error={!!errors.longitude_minutes}
                helperText={errors.longitude_minutes?.message || '(0 to 59)'}
                placeholder="e.g., 22"
                inputProps={{ step: '1' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="longitude_seconds"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Seconds"
                fullWidth
                error={!!errors.longitude_seconds}
                helperText={errors.longitude_seconds?.message || '(0.0 to 59.999)'}
                placeholder="e.g., 11.292"
                inputProps={{ step: '0.001' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        {/* Calculated Coordinates Display */}
        {(northCoordinate !== null || eastCoordinate !== null) && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
              <Typography variant="subtitle2" gutterBottom>
                Calculated Decimal Coordinates
              </Typography>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {northCoordinate !== null && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      North Coordinate (Latitude):
                    </Typography>
                    <Typography variant="h6">
                      {northCoordinate.toFixed(8)}°
                    </Typography>
                  </Box>
                )}
                {eastCoordinate !== null && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      East Coordinate (Longitude):
                    </Typography>
                    <Typography variant="h6">
                      {eastCoordinate.toFixed(8)}°
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Geodetic Datum - Read Only */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="geodetic_datum"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Geodetic Datum"
                fullWidth
                disabled
                value="PSD 93"
                helperText="Default geodetic datum (read-only)"
                InputProps={{
                  readOnly: true,
                }}
              />
            )}
          />
        </Grid>

        {/* Geodetic System - Read Only */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="geodetic_system"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Geodetic System"
                fullWidth
                disabled
                value="Universal Transverse Mercator"
                helperText="Default geodetic system (read-only)"
                InputProps={{
                  readOnly: true,
                }}
              />
            )}
          />
        </Grid>

        {/* Map Zone - Read Only */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="map_zone"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Map Zone"
                fullWidth
                disabled
                value="Zone 40N(54E to 60E)"
                helperText="Default map zone (read-only)"
                InputProps={{
                  readOnly: true,
                }}
              />
            )}
          />
        </Grid>

        {/* North Reference - Read Only */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="north_reference"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="North Reference"
                fullWidth
                disabled
                value="Grid North"
                helperText="Default north reference (read-only)"
                InputProps={{
                  readOnly: true,
                }}
              />
            )}
          />
        </Grid>

        {/* Central Meridian */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="central_meridian"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Central Meridian"
                fullWidth
                required
                error={!!errors.central_meridian}
                helperText={errors.central_meridian?.message || 'Decimal degrees (-180 to 180)'}
                placeholder="e.g., -93.0"
                inputProps={{ step: '0.1' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        {/* Calculated Fields Info */}
        <Grid item xs={12}>
          <Alert severity="info">
            Fields such as Easting, Northing, Grid Correction, G_T, and W_T will be automatically calculated by the backend.
          </Alert>
        </Grid>
      </Grid>
    </>
  );
};
