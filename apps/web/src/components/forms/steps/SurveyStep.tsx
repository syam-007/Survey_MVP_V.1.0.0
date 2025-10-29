import React, { useEffect, useRef } from 'react';
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
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { GridWrapper as Grid } from './GridWrapper';
import type { SurveyType, CreateSurveyInput } from '../../../types';

/**
 * Validation schema for Survey step
 */
const surveySchema = yup.object({
  survey_type: yup
    .mixed<SurveyType>()
    .oneOf(['Type 1 - GTL', 'Type 2 - Gyro', 'Type 3 - MWD', 'Type 4 - Unknown'])
    .required('Survey type is required'),
  file_path: yup
    .string()
    .nullable()
    .max(255, 'File path cannot exceed 255 characters'),
  required_columns: yup.object({
    md: yup.boolean().required(),
    inc: yup.boolean().required(),
    azi: yup.boolean().required(),
  }).required('Required columns must be specified'),
});

export interface SurveyStepProps {
  data: Partial<CreateSurveyInput>;
  onChange: (data: Partial<CreateSurveyInput>) => void;
}

/**
 * SurveyStep Component
 * Step 4 of the complete run creation workflow
 * Collects survey type and file information
 * Based on Story 3.5 AC#4
 */
export const SurveyStep: React.FC<SurveyStepProps> = ({
  data,
  onChange,
}) => {
  const {
    control,
    watch,
    formState: { errors },
  } = useForm<Partial<CreateSurveyInput>>({
    resolver: yupResolver(surveySchema) as any,
    defaultValues: {
      ...data,
      required_columns: data.required_columns || {
        md: true,
        inc: true,
        azi: true,
      },
    },
    mode: 'onBlur',
  });

  // Watch all form fields and update parent on change
  const formData = watch();

  // Use ref to store onChange to avoid infinite loop
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onChangeRef.current(formData);
  }, [formData]);

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Survey Information
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Select the survey calculation method and specify the survey data file location.
      </Typography>

      <Grid container spacing={3}>
        {/* Survey Type */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required error={!!errors.survey_type}>
            <InputLabel id="survey-type-label">Survey Type</InputLabel>
            <Controller
              name="survey_type"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="survey-type-label"
                  label="Survey Type"
                >
                  <MenuItem value="Type 1 - GTL">Type 1 - GTL</MenuItem>
                  <MenuItem value="Type 2 - Gyro">Type 2 - Gyro</MenuItem>
                  <MenuItem value="Type 3 - MWD">Type 3 - MWD </MenuItem>
                  <MenuItem value="Type 4 - Unknown">Type 4 - Unknown</MenuItem>
                </Select>
              )}
            />
            {errors.survey_type && (
              <FormHelperText>{errors.survey_type.message}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* File Path - Optional (files are uploaded separately) */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="file_path"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Survey File Path (Optional)"
                fullWidth
                error={!!errors.file_path}
                helperText={errors.file_path?.message || 'Leave empty - files will be uploaded after run creation'}
                placeholder="Auto-generated after file upload"
                disabled
              />
            )}
          />
        </Grid>

        {/* Required Columns */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" gutterBottom>
            Required Columns in Survey File
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Select which columns are present in your survey data file.
          </Alert>
          <FormGroup row>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Controller
                      name="required_columns.md"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          {...field}
                          checked={field.value || false}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
                    />
                  }
                  label="MD (Measured Depth)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Controller
                      name="required_columns.inc"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          {...field}
                          checked={field.value || false}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
                    />
                  }
                  label="INC (Inclination)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Controller
                      name="required_columns.azi"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          {...field}
                          checked={field.value || false}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
                    />
                  }
                  label="AZI (Azimuth)"
                />
              </Grid>
            </Grid>
          </FormGroup>
        </Grid>

        {/* Info Alert */}
        <Grid item xs={12}>
          <Alert severity="warning">
            Survey data will be processed asynchronously. Status will be updated to 'processing' and then 'completed' or 'failed'.
          </Alert>
        </Grid>
      </Grid>
    </>
  );
};
