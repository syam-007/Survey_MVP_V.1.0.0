import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  FormHelperText,
  Stack,
  Typography,
  Divider,
  Grid,
} from '@mui/material';
import type { CreateWellInput } from '../../types/well.types';

// Validation schema
const wellSchema = yup.object({
  well_id: yup
    .string()
    .required('Well ID is required')
    .max(100, 'Well ID must be at most 100 characters'),
  well_name: yup
    .string()
    .required('Well name is required')
    .max(255, 'Well name must be at most 255 characters'),
  location: yup.object({
    latitude: yup.number().nullable(),
    longitude: yup.number().nullable(),
    latitude_degrees: yup.number().min(0).max(90).nullable(),
    latitude_minutes: yup.number().min(0).max(60).nullable(),
    latitude_seconds: yup.number().min(0).max(60).nullable(),
    longitude_degrees: yup.number().min(0).max(180).nullable(),
    longitude_minutes: yup.number().min(0).max(60).nullable(),
    longitude_seconds: yup.number().min(0).max(60).nullable(),
    easting: yup.number().nullable(),
    northing: yup.number().nullable(),
    geodetic_datum: yup.string(),
    geodetic_system: yup.string(),
    map_zone: yup.string(),
    north_reference: yup.mixed().oneOf(['True North', 'Grid North', 'Magnetic North']),
    central_meridian: yup.number().nullable(),
  }),
});

interface WellFormProps {
  initialValues?: Partial<CreateWellInput>;
  onSubmit: (data: CreateWellInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

/**
 * WellForm Component
 * Reusable form for creating and editing wells
 * Based on Story 2.5 AC#2 and AC#4
 */
export const WellForm: React.FC<WellFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Submit',
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateWellInput>({
    resolver: yupResolver(wellSchema) as any,
    defaultValues: {
      well_id: initialValues?.well_id || '',
      well_name: initialValues?.well_name || '',
      location: {
        latitude: initialValues?.location?.latitude || null,
        longitude: initialValues?.location?.longitude || null,
        latitude_degrees: initialValues?.location?.latitude_degrees || null,
        latitude_minutes: initialValues?.location?.latitude_minutes || null,
        latitude_seconds: initialValues?.location?.latitude_seconds || null,
        longitude_degrees: initialValues?.location?.longitude_degrees || null,
        longitude_minutes: initialValues?.location?.longitude_minutes || null,
        longitude_seconds: initialValues?.location?.longitude_seconds || null,
        easting: initialValues?.location?.easting || null,
        northing: initialValues?.location?.northing || null,
        geodetic_datum: initialValues?.location?.geodetic_datum || 'PSD 93',
        geodetic_system: initialValues?.location?.geodetic_system || 'Universal Transverse Mercator',
        map_zone: initialValues?.location?.map_zone || 'Zone 40N(54E to 60E)',
        north_reference: initialValues?.location?.north_reference || 'Grid North',
        central_meridian: initialValues?.location?.central_meridian || null,
      },
    },
  });

  // Reset form when initialValues change (for edit mode)
  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
    }
  }, [initialValues, reset]);

  return (
    <Paper sx={{ p: 3 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3}>
          {/* Basic Well Information */}
          <Typography variant="h6" color="primary">Basic Information</Typography>
          <Divider />

          <Grid container spacing={2}>
            {/* Well ID Field */}
            <Grid item xs={12} md={6}>
              <Controller
                name="well_id"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Well ID"
                    fullWidth
                    required
                    disabled={isSubmitting}
                    error={!!errors.well_id}
                    helperText={errors.well_id?.message}
                    placeholder="Enter well ID"
                  />
                )}
              />
            </Grid>

            {/* Well Name Field */}
            <Grid item xs={12} md={6}>
              <Controller
                name="well_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Well Name"
                    fullWidth
                    required
                    disabled={isSubmitting}
                    error={!!errors.well_name}
                    helperText={errors.well_name?.message}
                    placeholder="Enter well name"
                  />
                )}
              />
            </Grid>
          </Grid>

          {/* Location Information */}
          <Typography variant="h6" color="primary" sx={{ mt: 2 }}>Location Information</Typography>
          <Divider />

          {/* Latitude/Longitude */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Controller
                name="location.latitude"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    label="Latitude (Decimal)"
                    fullWidth
                    type="number"
                    disabled={isSubmitting}
                    error={!!errors.location?.latitude}
                    helperText={errors.location?.latitude?.message}
                    placeholder="e.g., 25.123456"
                    inputProps={{ step: 'any' }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="location.longitude"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    label="Longitude (Decimal)"
                    fullWidth
                    type="number"
                    disabled={isSubmitting}
                    error={!!errors.location?.longitude}
                    helperText={errors.location?.longitude?.message}
                    placeholder="e.g., 55.123456"
                    inputProps={{ step: 'any' }}
                  />
                )}
              />
            </Grid>
          </Grid>

          {/* Latitude DMS */}
          <Typography variant="subtitle2" sx={{ mt: 1 }}>Latitude (Degrees, Minutes, Seconds)</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Controller
                name="location.latitude_degrees"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    label="Degrees"
                    fullWidth
                    type="number"
                    disabled={isSubmitting}
                    error={!!errors.location?.latitude_degrees}
                    helperText={errors.location?.latitude_degrees?.message}
                    inputProps={{ min: 0, max: 90 }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="location.latitude_minutes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    label="Minutes"
                    fullWidth
                    type="number"
                    disabled={isSubmitting}
                    error={!!errors.location?.latitude_minutes}
                    helperText={errors.location?.latitude_minutes?.message}
                    inputProps={{ min: 0, max: 60 }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="location.latitude_seconds"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    label="Seconds"
                    fullWidth
                    type="number"
                    disabled={isSubmitting}
                    error={!!errors.location?.latitude_seconds}
                    helperText={errors.location?.latitude_seconds?.message}
                    inputProps={{ min: 0, max: 60, step: 'any' }}
                  />
                )}
              />
            </Grid>
          </Grid>

          {/* Longitude DMS */}
          <Typography variant="subtitle2" sx={{ mt: 1 }}>Longitude (Degrees, Minutes, Seconds)</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Controller
                name="location.longitude_degrees"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    label="Degrees"
                    fullWidth
                    type="number"
                    disabled={isSubmitting}
                    error={!!errors.location?.longitude_degrees}
                    helperText={errors.location?.longitude_degrees?.message}
                    inputProps={{ min: 0, max: 180 }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="location.longitude_minutes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    label="Minutes"
                    fullWidth
                    type="number"
                    disabled={isSubmitting}
                    error={!!errors.location?.longitude_minutes}
                    helperText={errors.location?.longitude_minutes?.message}
                    inputProps={{ min: 0, max: 60 }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="location.longitude_seconds"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    label="Seconds"
                    fullWidth
                    type="number"
                    disabled={isSubmitting}
                    error={!!errors.location?.longitude_seconds}
                    helperText={errors.location?.longitude_seconds?.message}
                    inputProps={{ min: 0, max: 60, step: 'any' }}
                  />
                )}
              />
            </Grid>
          </Grid>

          {/* UTM Coordinates */}
          <Typography variant="subtitle2" sx={{ mt: 2 }}>UTM Coordinates</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Controller
                name="location.easting"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    label="Easting"
                    fullWidth
                    type="number"
                    disabled={isSubmitting}
                    error={!!errors.location?.easting}
                    helperText={errors.location?.easting?.message}
                    placeholder="Enter easting coordinate"
                    inputProps={{ step: 'any' }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="location.northing"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    label="Northing"
                    fullWidth
                    type="number"
                    disabled={isSubmitting}
                    error={!!errors.location?.northing}
                    helperText={errors.location?.northing?.message}
                    placeholder="Enter northing coordinate"
                    inputProps={{ step: 'any' }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="location.central_meridian"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    label="Central Meridian"
                    fullWidth
                    type="number"
                    disabled={isSubmitting}
                    error={!!errors.location?.central_meridian}
                    helperText={errors.location?.central_meridian?.message}
                    placeholder="e.g., 57"
                    inputProps={{ step: 'any' }}
                  />
                )}
              />
            </Grid>
          </Grid>

          {/* Geodetic System Information */}
          <Typography variant="subtitle2" sx={{ mt: 2 }}>Geodetic System</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Controller
                name="location.geodetic_datum"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Geodetic Datum"
                    fullWidth
                    disabled={isSubmitting}
                    error={!!errors.location?.geodetic_datum}
                    helperText={errors.location?.geodetic_datum?.message}
                    placeholder="PSD 93"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="location.geodetic_system"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Geodetic System"
                    fullWidth
                    disabled={isSubmitting}
                    error={!!errors.location?.geodetic_system}
                    helperText={errors.location?.geodetic_system?.message}
                    placeholder="Universal Transverse Mercator"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="location.map_zone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Map Zone"
                    fullWidth
                    disabled={isSubmitting}
                    error={!!errors.location?.map_zone}
                    helperText={errors.location?.map_zone?.message}
                    placeholder="Zone 40N(54E to 60E)"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="location.north_reference"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.location?.north_reference}>
                    <InputLabel>North Reference</InputLabel>
                    <Select
                      {...field}
                      label="North Reference"
                      disabled={isSubmitting}
                    >
                      <MenuItem value="True North">True North</MenuItem>
                      <MenuItem value="Grid North">Grid North</MenuItem>
                      <MenuItem value="Magnetic North">Magnetic North</MenuItem>
                    </Select>
                    {errors.location?.north_reference && (
                      <FormHelperText>{errors.location.north_reference.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : submitLabel}
            </Button>
          </Box>
        </Stack>
      </form>
    </Paper>
  );
};
