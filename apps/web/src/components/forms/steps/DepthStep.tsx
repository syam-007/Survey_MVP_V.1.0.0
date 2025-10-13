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
import type { ElevationReference, CreateDepthInput } from '../../../types';

/**
 * Validation schema for Depth step
 */
const depthSchema = yup.object({
  elevation_reference: yup
    .mixed<ElevationReference>()
    .oneOf(['KB', 'RT', 'Ground Level', 'Mean Sea Level', 'Other'])
    .required('Elevation reference is required'),
  reference_datum: yup
    .string()
    .required('Reference datum is required')
    .max(100, 'Reference datum cannot exceed 100 characters'),
  reference_height: yup
    .number()
    .required('Reference height is required'),
  reference_elevation: yup
    .number()
    .required('Reference elevation is required'),
});

export interface DepthStepProps {
  data: Partial<CreateDepthInput>;
  onChange: (data: Partial<CreateDepthInput>) => void;
  wellId?: string;
}

/**
 * DepthStep Component
 * Step 3 of the complete run creation workflow
 * Collects depth information (elevation reference, datum, heights)
 * Based on Story 3.5 AC#3
 */
export const DepthStep: React.FC<DepthStepProps> = ({
  data,
  onChange,
  wellId,
}) => {
  const {
    control,
    watch,
    formState: { errors },
  } = useForm<Partial<CreateDepthInput>>({
    resolver: yupResolver(depthSchema) as any,
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
        Depth Information
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Provide the elevation reference and datum information for depth measurements.
      </Typography>

      {wellId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Depth information can be auto-populated from the selected well if available.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Elevation Reference */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required error={!!errors.elevation_reference}>
            <InputLabel id="elevation-reference-label">Elevation Reference</InputLabel>
            <Controller
              name="elevation_reference"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="elevation-reference-label"
                  label="Elevation Reference"
                >
                  <MenuItem value="KB">KB (Kelly Bushing)</MenuItem>
                  <MenuItem value="RT">RT (Rotary Table)</MenuItem>
                  <MenuItem value="Ground Level">Ground Level</MenuItem>
                  <MenuItem value="Mean Sea Level">Mean Sea Level</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              )}
            />
            {errors.elevation_reference && (
              <FormHelperText>{errors.elevation_reference.message}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* Reference Datum */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="reference_datum"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Reference Datum"
                fullWidth
                required
                error={!!errors.reference_datum}
                helperText={errors.reference_datum?.message}
                placeholder="e.g., WGS84, NAVD88"
              />
            )}
          />
        </Grid>

        {/* Reference Height */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="reference_height"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Reference Height"
                fullWidth
                required
                error={!!errors.reference_height}
                helperText={errors.reference_height?.message || 'Height in feet or meters'}
                placeholder="e.g., 25.5"
                inputProps={{ step: '0.001' }}
              />
            )}
          />
        </Grid>

        {/* Reference Elevation */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="reference_elevation"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Reference Elevation"
                fullWidth
                required
                error={!!errors.reference_elevation}
                helperText={errors.reference_elevation?.message || 'Elevation in feet or meters'}
                placeholder="e.g., 1050.25"
                inputProps={{ step: '0.001' }}
              />
            )}
          />
        </Grid>

        {/* Info Alert */}
        <Grid item xs={12}>
          <Alert severity="info">
            Ensure all measurements use consistent units (either feet or meters) throughout the survey.
          </Alert>
        </Grid>
      </Grid>
    </>
  );
};
