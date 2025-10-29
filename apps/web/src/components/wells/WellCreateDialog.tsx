import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  CircularProgress,
  Typography,
  Box,
  Paper,
  FormHelperText,
  Divider,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { Well } from '../../types/well.types';
import wellsService from '../../services/wellsService';
import locationsService from '../../services/locationsService';

interface WellCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onWellCreated: (well: Well) => void;
}

interface WellWithLocationInput {
  well_id: string;
  well_name: string;
  latitude_degrees: number;
  latitude_minutes?: number;
  latitude_seconds?: number;
  longitude_degrees: number;
  longitude_minutes?: number;
  longitude_seconds?: number;
  easting: number;
  northing: number;
  central_meridian: number;
}

const wellWithLocationSchema = yup.object({
  well_id: yup
    .string()
    .required('Well ID is required')
    .max(100, 'Well ID cannot exceed 100 characters'),
  well_name: yup
    .string()
    .required('Well name is required')
    .max(255, 'Well name cannot exceed 255 characters'),
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
  easting: yup
    .number()
    .required('Easting is required')
    .min(0, 'Easting must be >= 0'),
  northing: yup
    .number()
    .required('Northing is required')
    .min(0, 'Northing must be >= 0'),
  central_meridian: yup
    .number()
    .required('Central meridian is required')
    .min(-180, 'Central meridian must be >= -180')
    .max(180, 'Central meridian must be <= 180'),
});

/**
 * WellCreateDialog Component
 * Dialog for creating a new well with location information
 */
export const WellCreateDialog: React.FC<WellCreateDialogProps> = ({
  open,
  onClose,
  onWellCreated,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<WellWithLocationInput>({
    resolver: yupResolver(wellWithLocationSchema) as any,
    defaultValues: {
      well_id: '',
      well_name: '',
      central_meridian: 57.0,
      latitude_degrees: undefined,
      latitude_minutes: 0,
      latitude_seconds: 0,
      longitude_degrees: undefined,
      longitude_minutes: 0,
      longitude_seconds: 0,
      easting: undefined,
      northing: undefined,
    },
  });

  const formData = watch();

  // Calculate coordinates from DMS in real-time
  // Formula: degrees + minutes/60 + seconds/3600
  const northCoordinate = useMemo(() => {
    const degrees = formData.latitude_degrees;
    const minutes = formData.latitude_minutes || 0;
    const seconds = formData.latitude_seconds || 0;

    if (degrees === undefined || degrees === null) return null;

    const result = degrees + minutes / 60 + seconds / 3600;
    return parseFloat(result.toFixed(8));
  }, [formData.latitude_degrees, formData.latitude_minutes, formData.latitude_seconds]);

  const eastCoordinate = useMemo(() => {
    const degrees = formData.longitude_degrees;
    const minutes = formData.longitude_minutes || 0;
    const seconds = formData.longitude_seconds || 0;

    if (degrees === undefined || degrees === null) return null;

    const result = degrees + minutes / 60 + seconds / 3600;
    return parseFloat(result.toFixed(8));
  }, [formData.longitude_degrees, formData.longitude_minutes, formData.longitude_seconds]);

  const onSubmit = async (data: WellWithLocationInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Create well with location in a single atomic transaction
      const newWell = await wellsService.createWellWithLocation(
        {
          well_id: data.well_id,
          well_name: data.well_name,
        },
        {
          latitude_degrees: data.latitude_degrees,
          latitude_minutes: data.latitude_minutes,
          latitude_seconds: data.latitude_seconds,
          longitude_degrees: data.longitude_degrees,
          longitude_minutes: data.longitude_minutes,
          longitude_seconds: data.longitude_seconds,
          easting: data.easting,
          northing: data.northing,
          geodetic_datum: 'PSD 93',
          geodetic_system: 'Universal Transverse Mercator',
          map_zone: 'Zone 40N(54E to 60E)',
          north_reference: 'Grid North',
          central_meridian: data.central_meridian,
        }
      );

      reset();
      onWellCreated(newWell);
      onClose();
    } catch (err: any) {
      console.error('Well creation error - Full error:', err);
      console.error('Error response:', err.response);
      console.error('Error response data:', err.response?.data);
      console.error('Error status:', err.response?.status);

      let errorMessage = 'Failed to create well with location';

      if (err.response?.data) {
        if (err.response.data.details) {
          // DRF validation errors
          errorMessage = JSON.stringify(err.response.data.details, null, 2);
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else {
          errorMessage = JSON.stringify(err.response.data, null, 2);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Well with Location</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {/* Well Information */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Well Information
            </Typography>

            <Controller
              name="well_id"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Well ID"
                  fullWidth
                  required
                  autoFocus
                  error={!!errors.well_id}
                  helperText={errors.well_id?.message || 'Unique well identifier'}
                  placeholder="e.g., OM11638"
                  disabled={isSubmitting}
                />
              )}
            />

            <Controller
              name="well_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Well Name"
                  fullWidth
                  required
                  error={!!errors.well_name}
                  helperText={errors.well_name?.message}
                  placeholder="e.g., Oman Well 11638"
                  disabled={isSubmitting}
                />
              )}
            />

            <Divider />

            {/* Location Information */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Location Information
            </Typography>

            {/* Latitude DMS */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Latitude (Degrees, Minutes, Seconds)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 120 }}>
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
                        inputProps={{ step: '1' }}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 120 }}>
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
                        inputProps={{ step: '1' }}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 120 }}>
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
                        helperText={errors.latitude_seconds?.message || '(0 to 59.999)'}
                        inputProps={{ step: '0.001' }}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Box>
              </Box>
            </Box>

            {/* Longitude DMS */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Longitude (Degrees, Minutes, Seconds)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 120 }}>
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
                        inputProps={{ step: '1' }}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 120 }}>
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
                        inputProps={{ step: '1' }}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 120 }}>
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
                        helperText={errors.longitude_seconds?.message || '(0 to 59.999)'}
                        inputProps={{ step: '0.001' }}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Box>
              </Box>
            </Box>

            {/* Calculated Coordinates Display */}
            {(northCoordinate !== null || eastCoordinate !== null) && (
              <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Calculated Decimal Coordinates
                </Typography>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {northCoordinate !== null && (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Latitude:
                      </Typography>
                      <Typography variant="h6">
                        {northCoordinate.toFixed(8)}°
                      </Typography>
                    </Box>
                  )}
                  {eastCoordinate !== null && (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Longitude:
                      </Typography>
                      <Typography variant="h6">
                        {eastCoordinate.toFixed(8)}°
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            )}

            <Divider />

            {/* UTM Coordinates Section */}
            <Typography variant="subtitle2" gutterBottom>
              UTM Coordinates
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {/* Easting */}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Controller
                  name="easting"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Easting"
                      fullWidth
                      required
                      error={!!errors.easting}
                      helperText={errors.easting?.message || 'UTM Easting coordinate (meters)'}
                      placeholder="e.g., 500000.000"
                      inputProps={{ step: '0.001' }}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </Box>

              {/* Northing */}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Controller
                  name="northing"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Northing"
                      fullWidth
                      required
                      error={!!errors.northing}
                      helperText={errors.northing?.message || 'UTM Northing coordinate (meters)'}
                      placeholder="e.g., 3500000.000"
                      inputProps={{ step: '0.001' }}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </Box>
            </Box>

            <Divider />

            {/* Geodetic System Information */}
            <Typography variant="subtitle2" gutterBottom>
              Geodetic System (Read-Only Defaults)
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {/* Geodetic Datum - Read Only */}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="Geodetic Datum"
                  fullWidth
                  disabled
                  value="PSD 93"
                  helperText="Default geodetic datum (read-only)"
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Box>

              {/* Geodetic System - Read Only */}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="Geodetic System"
                  fullWidth
                  disabled
                  value="Universal Transverse Mercator"
                  helperText="Default geodetic system (read-only)"
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {/* Map Zone - Read Only */}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="Map Zone"
                  fullWidth
                  disabled
                  value="Zone 40N(54E to 60E)"
                  helperText="Default map zone (read-only)"
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Box>

              {/* North Reference - Read Only */}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="North Reference"
                  fullWidth
                  disabled
                  value="Grid North"
                  helperText="Default north reference (read-only)"
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Box>
            </Box>

            {/* Central Meridian */}
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
                  inputProps={{ step: '0.1' }}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  disabled={isSubmitting}
                />
              )}
            />

            {error && (
              <FormHelperText error sx={{ fontSize: '0.9rem' }}>
                {error}
              </FormHelperText>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? 'Creating...' : 'Create Well'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
