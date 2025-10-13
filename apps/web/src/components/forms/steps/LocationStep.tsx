import React, { useEffect } from 'react';
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
} from '@mui/material';
import { GridWrapper as Grid } from './GridWrapper';
import type { GeodeticSystem, NorthReference, CreateLocationInput } from '../../../types';

/**
 * Validation schema for Location step
 */
const locationSchema = yup.object({
  latitude: yup
    .number()
    .required('Latitude is required')
    .min(-90, 'Latitude must be >= -90')
    .max(90, 'Latitude must be <= 90'),
  longitude: yup
    .number()
    .required('Longitude is required')
    .min(-180, 'Longitude must be >= -180')
    .max(180, 'Longitude must be <= 180'),
  geodetic_system: yup
    .mixed<GeodeticSystem>()
    .oneOf(['WGS84', 'NAD83', 'NAD27', 'Other'])
    .required('Geodetic system is required'),
  map_zone: yup
    .string()
    .required('Map zone is required')
    .max(100, 'Map zone cannot exceed 100 characters'),
  north_reference: yup
    .mixed<NorthReference>()
    .oneOf(['True North', 'Magnetic North', 'Grid North'])
    .required('North reference is required'),
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
    defaultValues: data,
    mode: 'onBlur',
  });

  // Watch all form fields and update parent on change
  const formData = watch();

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

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
        {/* Latitude */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="latitude"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Latitude"
                fullWidth
                required
                error={!!errors.latitude}
                helperText={errors.latitude?.message || 'Decimal degrees (-90 to 90)'}
                placeholder="e.g., 29.760427"
                inputProps={{ step: '0.000001' }}
              />
            )}
          />
        </Grid>

        {/* Longitude */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="longitude"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Longitude"
                fullWidth
                required
                error={!!errors.longitude}
                helperText={errors.longitude?.message || 'Decimal degrees (-180 to 180)'}
                placeholder="e.g., -95.369803"
                inputProps={{ step: '0.000001' }}
              />
            )}
          />
        </Grid>

        {/* Geodetic System */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required error={!!errors.geodetic_system}>
            <InputLabel id="geodetic-system-label">Geodetic System</InputLabel>
            <Controller
              name="geodetic_system"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="geodetic-system-label"
                  label="Geodetic System"
                >
                  <MenuItem value="WGS84">WGS84</MenuItem>
                  <MenuItem value="NAD83">NAD83</MenuItem>
                  <MenuItem value="NAD27">NAD27</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              )}
            />
            {errors.geodetic_system && (
              <FormHelperText>{errors.geodetic_system.message}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* Map Zone */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="map_zone"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Map Zone"
                fullWidth
                required
                error={!!errors.map_zone}
                helperText={errors.map_zone?.message}
                placeholder="e.g., UTM Zone 15N"
              />
            )}
          />
        </Grid>

        {/* North Reference */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required error={!!errors.north_reference}>
            <InputLabel id="north-reference-label">North Reference</InputLabel>
            <Controller
              name="north_reference"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="north-reference-label"
                  label="North Reference"
                >
                  <MenuItem value="True North">True North</MenuItem>
                  <MenuItem value="Magnetic North">Magnetic North</MenuItem>
                  <MenuItem value="Grid North">Grid North</MenuItem>
                </Select>
              )}
            />
            {errors.north_reference && (
              <FormHelperText>{errors.north_reference.message}</FormHelperText>
            )}
          </FormControl>
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
