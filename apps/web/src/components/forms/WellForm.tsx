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
} from '@mui/material';
import type { CreateWellInput, WellType } from '../../types/well.types';

// Validation schema
const wellSchema = yup.object({
  well_name: yup
    .string()
    .required('Well name is required')
    .max(255, 'Well name must be at most 255 characters'),
  well_type: yup
    .mixed<WellType>()
    .oneOf(['Oil', 'Gas', 'Water', 'Other'])
    .required('Well type is required'),
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
      well_name: initialValues?.well_name || '',
      well_type: initialValues?.well_type || 'Oil',
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
          {/* Well Name Field */}
          <Box>
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
          </Box>

          {/* Well Type Field */}
          <Box>
            <Controller
              name="well_type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth required error={!!errors.well_type}>
                  <InputLabel>Well Type</InputLabel>
                  <Select
                    {...field}
                    label="Well Type"
                    disabled={isSubmitting}
                  >
                    <MenuItem value="Oil">Oil</MenuItem>
                    <MenuItem value="Gas">Gas</MenuItem>
                    <MenuItem value="Water">Water</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                  {errors.well_type && (
                    <FormHelperText>{errors.well_type.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Box>

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
