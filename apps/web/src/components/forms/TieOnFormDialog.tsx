import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Typography,
  FormControlLabel,
  Checkbox,
  Alert,
  Grid,
  CircularProgress,
} from '@mui/material';
import type { WellType, CreateTieOnInput } from '../../types';

/**
 * Validation schema for TieOn form
 */
const tieonSchema = yup.object({
  md: yup
    .number()
    .required('Measured depth is required')
    .min(0, 'MD must be >= 0'),
  inc: yup
    .number()
    .required('Inclination is required')
    .min(0, 'Inclination must be >= 0')
    .max(180, 'Inclination must be <= 180'),
  azi: yup
    .number()
    .required('Azimuth is required')
    .min(0, 'Azimuth must be >= 0')
    .max(360, 'Azimuth must be < 360'),
  tvd: yup
    .number()
    .required('True vertical depth is required')
    .min(0, 'TVD must be >= 0'),
  latitude: yup
    .number()
    .required('Latitude/Northing is required'),
  departure: yup
    .number()
    .required('Departure/Easting is required'),
  well_type: yup
    .mixed<WellType>()
    .oneOf(['Vertical', 'Deviated', 'Horizontal'])
    .required('Well type is required'),
  survey_interval_from: yup
    .number()
    .required('Survey interval from is required')
    .min(0, 'Must be >= 0'),
  survey_interval_to: yup
    .number()
    .required('Survey interval to is required')
    .min(0, 'Must be >= 0')
    .test('greater-than-from', 'Survey interval to must be greater than from', function(value) {
      return value > this.parent.survey_interval_from;
    }),
});

export interface TieOnFormDialogProps {
  open: boolean;
  runId: string;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * TieOnFormDialog Component
 * Standalone dialog for creating tie-on information for an existing run
 */
export const TieOnFormDialog: React.FC<TieOnFormDialogProps> = ({
  open,
  runId,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Omit<CreateTieOnInput, 'run'>>({
    resolver: yupResolver(tieonSchema) as any,
    defaultValues: {
      md: '' as any,
      inc: '' as any,
      azi: '' as any,
      tvd: '' as any,
      latitude: '' as any,
      departure: '' as any,
      well_type: '' as any,
      survey_interval_from: '' as any,
      survey_interval_to: '' as any,
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: Omit<CreateTieOnInput, 'run'>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Import the service dynamically to avoid circular dependencies
      const { default: tieonsService } = await import('../../services/tieonsService');

      await tieonsService.createTieOn({
        ...data,
        run: runId,
      } as CreateTieOnInput);

      // Success
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create tie-on:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to create tie-on information');
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
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Add Tie-On Information</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph sx={{ mt: 1 }}>
          Provide the tie-on point data for connecting the survey to the wellbore. This information is required before uploading survey files.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* MD */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="md"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Measured Depth (MD)"
                  fullWidth
                  required
                  error={!!errors.md}
                  helperText={errors.md?.message}
                  placeholder="e.g., 1000.5"
                  inputProps={{ step: '0.001' }}
                />
              )}
            />
          </Grid>

          {/* INC */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="inc"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Inclination (INC)"
                  fullWidth
                  required
                  error={!!errors.inc}
                  helperText={errors.inc?.message || 'Degrees (0-180)'}
                  placeholder="e.g., 45.25"
                  inputProps={{ step: '0.01', min: 0, max: 180 }}
                />
              )}
            />
          </Grid>

          {/* AZI */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="azi"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Azimuth (AZI)"
                  fullWidth
                  required
                  error={!!errors.azi}
                  helperText={errors.azi?.message || 'Degrees (0-360)'}
                  placeholder="e.g., 180.75"
                  inputProps={{ step: '0.01', min: 0, max: 360 }}
                />
              )}
            />
          </Grid>

          {/* TVD */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="tvd"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="True Vertical Depth (TVD)"
                  fullWidth
                  required
                  error={!!errors.tvd}
                  helperText={errors.tvd?.message}
                  placeholder="e.g., 950.3"
                  inputProps={{ step: '0.001' }}
                />
              )}
            />
          </Grid>

          {/* Latitude / Northing */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="latitude"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Latitude / Northing"
                  fullWidth
                  required
                  error={!!errors.latitude}
                  helperText={errors.latitude?.message || '+N / -S'}
                  placeholder="e.g., 29.760427"
                  inputProps={{ step: '0.000001' }}
                />
              )}
            />
          </Grid>

          {/* Departure / Easting */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="departure"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Departure / Easting"
                  fullWidth
                  required
                  error={!!errors.departure}
                  helperText={errors.departure?.message || '+E / -W'}
                  placeholder="e.g., -95.369803"
                  inputProps={{ step: '0.000001' }}
                />
              )}
            />
          </Grid>

          {/* Well Type */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required error={!!errors.well_type}>
              <InputLabel id="well-type-label">Well Type</InputLabel>
              <Controller
                name="well_type"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="well-type-label"
                    label="Well Type"
                  >
                    <MenuItem value="Vertical">Vertical</MenuItem>
                    <MenuItem value="Deviated">Deviated</MenuItem>
                    <MenuItem value="Horizontal">Horizontal</MenuItem>
                  </Select>
                )}
              />
              {errors.well_type && (
                <FormHelperText>{errors.well_type.message}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Survey Interval From */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="survey_interval_from"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Survey Interval From"
                  fullWidth
                  required
                  error={!!errors.survey_interval_from}
                  helperText={errors.survey_interval_from?.message}
                  placeholder="e.g., 1000.0"
                  inputProps={{ step: '0.001' }}
                />
              )}
            />
          </Grid>

          {/* Survey Interval To */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="survey_interval_to"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Survey Interval To"
                  fullWidth
                  required
                  error={!!errors.survey_interval_to}
                  helperText={errors.survey_interval_to?.message}
                  placeholder="e.g., 5000.0"
                  inputProps={{ step: '0.001' }}
                />
              )}
            />
          </Grid>

          {/* Info Alert */}
          <Grid item xs={12}>
            <Alert severity="info">
              Survey interval length will be automatically calculated as (To - From).
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting && <CircularProgress size={20} />}
        >
          {isSubmitting ? 'Creating...' : 'Create Tie-On'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
