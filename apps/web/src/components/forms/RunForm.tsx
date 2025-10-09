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
  FormControlLabel,
  Checkbox,
  Button,
  Paper,
  Typography,
  FormHelperText,
  Stack,
} from '@mui/material';
import type { CreateRunInput, RunType } from '../../types/run.types';

// Validation schema
const runSchema = yup.object({
  run_number: yup
    .string()
    .required('Run number is required')
    .max(100, 'Run number must be at most 100 characters'),
  run_name: yup
    .string()
    .required('Run name is required')
    .max(255, 'Run name must be at most 255 characters'),
  run_type: yup
    .mixed<RunType>()
    .oneOf(['GTL', 'Gyro', 'MWD', 'Unknown'])
    .required('Run type is required'),
  vertical_section: yup
    .number()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === '' ? null : value
    ),
  bhc_enabled: yup.boolean(),
  proposal_direction: yup
    .number()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === '' ? null : value
    )
    .when('bhc_enabled', {
      is: false,
      then: (schema) => schema.required('Proposal direction is required when BHC is disabled'),
      otherwise: (schema) => schema.nullable(),
    }),
  grid_correction: yup
    .number()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === '' ? null : value
    ),
});

interface RunFormProps {
  initialValues?: Partial<CreateRunInput>;
  onSubmit: (data: CreateRunInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

/**
 * RunForm Component
 * Reusable form for creating and editing runs
 * Based on Story 2.4 AC#2 and AC#4
 */
export const RunForm: React.FC<RunFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Submit',
}) => {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateRunInput>({
    resolver: yupResolver(runSchema) as any,
    defaultValues: {
      run_number: initialValues?.run_number || '',
      run_name: initialValues?.run_name || '',
      run_type: initialValues?.run_type || 'Unknown',
      vertical_section: initialValues?.vertical_section || null,
      bhc_enabled: initialValues?.bhc_enabled ?? true,
      proposal_direction: initialValues?.proposal_direction || null,
      grid_correction: initialValues?.grid_correction || null,
    },
  });

  const bhcEnabled = watch('bhc_enabled');

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
          {/* Run Number and Run Name Row */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <Controller
                name="run_number"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Run Number"
                    fullWidth
                    required
                    error={!!errors.run_number}
                    helperText={errors.run_number?.message}
                  />
                )}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Controller
                name="run_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Run Name"
                    fullWidth
                    required
                    error={!!errors.run_name}
                    helperText={errors.run_name?.message}
                  />
                )}
              />
            </Box>
          </Stack>

          {/* Run Type and Vertical Section Row */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <Controller
                name="run_type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth required error={!!errors.run_type}>
                    <InputLabel>Run Type</InputLabel>
                    <Select {...field} label="Run Type">
                      <MenuItem value="GTL">GTL</MenuItem>
                      <MenuItem value="Gyro">Gyro</MenuItem>
                      <MenuItem value="MWD">MWD</MenuItem>
                      <MenuItem value="Unknown">Unknown</MenuItem>
                    </Select>
                    {errors.run_type && (
                      <FormHelperText>{errors.run_type.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Controller
                name="vertical_section"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    label="Vertical Section"
                    type="number"
                    fullWidth
                    error={!!errors.vertical_section}
                    helperText={errors.vertical_section?.message}
                  />
                )}
              />
            </Box>
          </Stack>

          {/* BHC Enabled Checkbox */}
          <Box>
            <Controller
              name="bhc_enabled"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      {...field}
                      checked={field.value}
                    />
                  }
                  label="BHC Enabled"
                />
              )}
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
              When disabled, Proposal Direction is required
            </Typography>
          </Box>

          {/* Proposal Direction and Grid Correction Row */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <Controller
                name="proposal_direction"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    label="Proposal Direction"
                    type="number"
                    fullWidth
                    required={!bhcEnabled}
                    disabled={bhcEnabled}
                    error={!!errors.proposal_direction}
                    helperText={
                      errors.proposal_direction?.message ||
                      (bhcEnabled ? 'Disabled when BHC is enabled' : '')
                    }
                  />
                )}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Controller
                name="grid_correction"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    label="Grid Correction"
                    type="number"
                    fullWidth
                    error={!!errors.grid_correction}
                    helperText={errors.grid_correction?.message}
                  />
                )}
              />
            </Box>
          </Stack>

          {/* Action Buttons */}
          <Box display="flex" gap={2} justifyContent="flex-end">
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
