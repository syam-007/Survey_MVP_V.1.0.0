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
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { CreateLocationInput, Location } from '../../types/location.types';
import locationsService from '../../services/locationsService';

interface LocationCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onLocationCreated: (location: Location) => void;
  wellId?: string;
}

const locationSchema = yup.object({
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
  central_meridian: yup
    .number()
    .required('Central meridian is required')
    .min(-180, 'Central meridian must be >= -180')
    .max(180, 'Central meridian must be <= 180'),
});

/**
 * LocationCreateDialog Component
 * Dialog for creating a new location inline during run creation
 */
export const LocationCreateDialog: React.FC<LocationCreateDialogProps> = ({
  open,
  onClose,
  onLocationCreated,
  wellId,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<Partial<CreateLocationInput>>({
    resolver: yupResolver(locationSchema) as any,
    defaultValues: {
      geodetic_datum: 'PSD 93',
      geodetic_system: 'Universal Transverse Mercator',
      map_zone: 'Zone 40N(54E to 60E)',
      north_reference: 'Grid North',
      central_meridian: 57.0,
      latitude_degrees: undefined,
      latitude_minutes: 0,
      latitude_seconds: 0,
      longitude_degrees: undefined,
      longitude_minutes: 0,
      longitude_seconds: 0,
    },
  });

  const formData = watch();

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

  const onSubmit = async (data: Partial<CreateLocationInput>) => {
    if (!wellId) {
      setError('Well ID is required to create a location');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // Note: We're creating a location without a run ID initially
      // The backend needs to support creating locations with just well_id
      const locationData: any = {
        ...data,
        well: wellId,
      };

      const newLocation = await locationsService.createLocation(locationData);
      reset();
      onLocationCreated(newLocation);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create location');
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
      <DialogTitle>Create New Location</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
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
                        autoFocus
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
            {isSubmitting ? 'Creating...' : 'Create Location'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
