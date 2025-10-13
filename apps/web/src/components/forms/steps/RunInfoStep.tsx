import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  TextField,
  MenuItem,
  Stack,
  Box,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
} from '@mui/material';
import type { RunType, CreateRunInput } from '../../../types';

/**
 * Validation schema for Run Info step
 */
const runInfoSchema = yup.object({
  run_number: yup
    .string()
    .required('Run number is required')
    .max(100, 'Run number cannot exceed 100 characters'),
  run_name: yup
    .string()
    .required('Run name is required')
    .max(255, 'Run name cannot exceed 255 characters'),
  run_type: yup
    .mixed<RunType>()
    .oneOf(['GTL', 'Gyro', 'MWD', 'Unknown'])
    .required('Run type is required'),
  well: yup
    .string()
    .uuid('Invalid well ID')
    .required('Well is required'),
});

export interface RunInfoStepProps {
  data: Partial<CreateRunInput>;
  onChange: (data: Partial<CreateRunInput>) => void;
  wells?: Array<{ id: string; well_name: string }>;
}

/**
 * RunInfoStep Component
 * Step 1 of the complete run creation workflow
 * Collects basic run information
 * Based on Story 3.5 AC#1
 */
export const RunInfoStep: React.FC<RunInfoStepProps> = ({
  data,
  onChange,
  wells = [],
}) => {
  const {
    control,
    watch,
    formState: { errors },
  } = useForm<Partial<CreateRunInput>>({
    resolver: yupResolver(runInfoSchema) as any,
    defaultValues: data,
    mode: 'onBlur',
  });

  // Watch all form fields and update parent on change
  const formData = watch();

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  return (
    <Stack spacing={3}>
      {/* Run Number and Run Name - Side by side on larger screens */}
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
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
                placeholder="e.g., RUN-001"
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
                placeholder="e.g., Production Survey Run"
              />
            )}
          />
        </Box>
      </Box>

      {/* Run Type and Well - Side by side on larger screens */}
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth required error={!!errors.run_type}>
            <InputLabel id="run-type-label">Run Type</InputLabel>
            <Controller
              name="run_type"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="run-type-label"
                  label="Run Type"
                >
                  <MenuItem value="GTL">GTL</MenuItem>
                  <MenuItem value="Gyro">Gyro</MenuItem>
                  <MenuItem value="MWD">MWD</MenuItem>
                  <MenuItem value="Unknown">Unknown</MenuItem>
                </Select>
              )}
            />
            {errors.run_type && (
              <FormHelperText>{errors.run_type.message}</FormHelperText>
            )}
          </FormControl>
        </Box>

        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth required error={!!errors.well}>
            <InputLabel id="well-label">Well</InputLabel>
            <Controller
              name="well"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="well-label"
                  label="Well"
                >
                  {wells.length === 0 ? (
                    <MenuItem value="" disabled>
                      No wells available
                    </MenuItem>
                  ) : (
                    wells.map((well) => (
                      <MenuItem key={well.id} value={well.id}>
                        {well.well_name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              )}
            />
            {errors.well && (
              <FormHelperText>{errors.well.message}</FormHelperText>
            )}
          </FormControl>
        </Box>
      </Box>
    </Stack>
  );
};
