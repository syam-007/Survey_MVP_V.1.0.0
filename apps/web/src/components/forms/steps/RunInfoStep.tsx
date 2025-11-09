import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { CheckCircle as CheckIcon, Error as ErrorIcon } from '@mui/icons-material';
import type { SurveyType, RunType, CreateRunInput } from '../../../types';
import type { Well } from '../../../types/well.types';
import runsService from '../../../services/runsService';
import { WellAutocompleteWithCreate } from '../../wells/WellAutocompleteWithCreate';

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
  survey_type: yup
    .mixed<SurveyType>()
    .oneOf(['GTL', 'Gyro', 'MWD', 'Unknown'])
    .required('Survey type is required'),
  run_type: yup
    .mixed<RunType>()
    .oneOf(['Memory', 'Surface Readout', 'Dummy', 'Test Stand'])
    .nullable()
    .notRequired(),
  well: yup
    .string()
    .uuid('Invalid well ID')
    .required('Well is required'),
});

export interface RunInfoStepProps {
  data: Partial<CreateRunInput>;
  onChange: (data: Partial<CreateRunInput>) => void;
  wells?: Well[];
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
    setError,
    clearErrors,
    setValue,
  } = useForm<Partial<CreateRunInput>>({
    resolver: yupResolver(runInfoSchema) as any,
    defaultValues: data,
    mode: 'onBlur',
  });

  // Validation states
  const [runNumberValidating, setRunNumberValidating] = useState(false);
  const [runNameValidating, setRunNameValidating] = useState(false);
  const [runNumberExists, setRunNumberExists] = useState(false);
  const [runNameExists, setRunNameExists] = useState(false);

  // Well selection state
  const [selectedWell, setSelectedWell] = useState<Well | null>(null);
  const initializedWellIdRef = useRef<string | null>(null);

  // Initialize selected well from data if well ID is provided
  useEffect(() => {
    // Only set initial well if we have a well ID and haven't initialized it yet
    if (data.well && data.well !== initializedWellIdRef.current && wells && wells.length > 0) {
      console.log('Setting initial well from data.well:', data.well);
      const well = wells.find(w => w.id === data.well);
      if (well) {
        console.log('Found well in wells array:', well);
        setSelectedWell(well);
        initializedWellIdRef.current = data.well;
      } else {
        console.log('Well not found in wells array');
      }
    } else if (!data.well && initializedWellIdRef.current) {
      // Reset if well ID is cleared
      console.log('Clearing selected well');
      setSelectedWell(null);
      initializedWellIdRef.current = null;
    }
  }, [data.well, wells]);

  // Watch all form fields and update parent on change
  const formData = watch();
  const runNumber = watch('run_number');
  const runName = watch('run_name');

  // Use ref to store onChange to avoid infinite loop
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Preserve job field from initial data (hidden field for job association)
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    // Include job field from initial data if it exists
    onChangeRef.current({
      ...formData,
      job: dataRef.current.job,
    });
  }, [formData]);

  // Debounced validation for run_number
  useEffect(() => {
    if (!runNumber || runNumber.trim() === '') {
      setRunNumberExists(false);
      return;
    }

    setRunNumberValidating(true);
    const timeoutId = setTimeout(async () => {
      try {
        const result = await runsService.validateUnique(runNumber.trim());
        setRunNumberExists(result.run_number_exists);

        if (result.run_number_exists) {
          setError('run_number', {
            type: 'manual',
            message: 'This run number already exists',
          });
        } else {
          clearErrors('run_number');
        }
      } catch (error) {
        console.error('Run number validation failed:', error);
      } finally {
        setRunNumberValidating(false);
      }
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timeoutId);
      setRunNumberValidating(false);
    };
  }, [runNumber, setError, clearErrors]);

  // Debounced validation for run_name
  useEffect(() => {
    if (!runName || runName.trim() === '') {
      setRunNameExists(false);
      return;
    }

    setRunNameValidating(true);
    const timeoutId = setTimeout(async () => {
      try {
        const result = await runsService.validateUnique(undefined, runName.trim());
        setRunNameExists(result.run_name_exists);

        if (result.run_name_exists) {
          setError('run_name', {
            type: 'manual',
            message: 'This run name already exists',
          });
        } else {
          clearErrors('run_name');
        }
      } catch (error) {
        console.error('Run name validation failed:', error);
      } finally {
        setRunNameValidating(false);
      }
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timeoutId);
      setRunNameValidating(false);
    };
  }, [runName, setError, clearErrors]);

  // Helper to get validation icon
  const getValidationIcon = (isValidating: boolean, exists: boolean, hasValue: boolean) => {
    if (!hasValue) return null;
    if (isValidating) {
      return (
        <InputAdornment position="end">
          <CircularProgress size={20} />
        </InputAdornment>
      );
    }
    if (exists) {
      return (
        <InputAdornment position="end">
          <ErrorIcon color="error" />
        </InputAdornment>
      );
    }
    return (
      <InputAdornment position="end">
        <CheckIcon color="success" />
      </InputAdornment>
    );
  };

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
                InputProps={{
                  endAdornment: getValidationIcon(
                    runNumberValidating,
                    runNumberExists,
                    !!runNumber && runNumber.trim() !== ''
                  ),
                }}
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
                InputProps={{
                  endAdornment: getValidationIcon(
                    runNameValidating,
                    runNameExists,
                    !!runName && runName.trim() !== ''
                  ),
                }}
              />
            )}
          />
        </Box>
      </Box>

      {/* Survey Type and Run Type - Side by side on larger screens */}
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth required error={!!errors.survey_type}>
            <InputLabel id="survey-type-label">Survey Type</InputLabel>
            <Controller
              name="survey_type"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  value={field.value || ''}
                  labelId="survey-type-label"
                  label="Survey Type"
                >
                  <MenuItem value="GTL">GTL</MenuItem>
                  <MenuItem value="Gyro">Gyro</MenuItem>
                  <MenuItem value="MWD">MWD</MenuItem>
                  <MenuItem value="Unknown">Unknown</MenuItem>
                </Select>
              )}
            />
            {errors.survey_type && (
              <FormHelperText>{errors.survey_type.message}</FormHelperText>
            )}
          </FormControl>
        </Box>

        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth error={!!errors.run_type}>
            <InputLabel id="run-type-label">Run Type</InputLabel>
            <Controller
              name="run_type"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  value={field.value || ''}
                  labelId="run-type-label"
                  label="Run Type"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  <MenuItem value="Memory">Memory</MenuItem>
                  <MenuItem value="Surface Readout">Surface Readout</MenuItem>
                  <MenuItem value="Dummy">Dummy</MenuItem>
                  <MenuItem value="Test Stand">Test Stand</MenuItem>
                </Select>
              )}
            />
            {errors.run_type && (
              <FormHelperText>{errors.run_type.message}</FormHelperText>
            )}
          </FormControl>
        </Box>
      </Box>

      {/* Well */}
      <Box>
        <WellAutocompleteWithCreate
          value={selectedWell}
          onChange={(well) => {
            setSelectedWell(well);
            setValue('well', well?.id || '', { shouldValidate: true });
          }}
          error={!!errors.well}
          helperText={errors.well?.message}
          required
          label="Well"
          wells={wells}
        />
      </Box>
    </Stack>
  );
};
