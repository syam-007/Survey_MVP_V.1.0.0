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
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { GridWrapper as Grid } from './GridWrapper';
import type { WellType, HoleSection, SurveyToolType, CreateTieOnInput } from '../../../types';

/**
 * Validation schema for TieOn step
 */
const tieonSchema = yup.object({
  md: yup
    .number()
    .required('Measured depth is required')
    .positive('MD must be positive'),
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
    .positive('TVD must be positive'),
  latitude: yup
    .number()
    .required('Latitude is required'),
  departure: yup
    .number()
    .required('Departure is required'),
  well_type: yup
    .mixed<WellType>()
    .oneOf(['Vertical', 'Deviated', 'Horizontal'])
    .required('Well type is required'),
  hole_section: yup
    .mixed<HoleSection>()
    .oneOf(['Surface Casing', 'Intermediate Casing', 'Production Casing', 'Liner', 'Open Hole'])
    .required('Hole section is required'),
  casing_selected: yup.boolean().required(),
  drillpipe_selected: yup.boolean().required(),
  survey_tool_type: yup
    .mixed<SurveyToolType>()
    .oneOf(['MWD', 'LWD', 'Wireline Gyro', 'Steering Tool', 'Other'])
    .required('Survey tool type is required'),
  survey_interval_from: yup
    .number()
    .required('Survey interval from is required')
    .positive('Must be positive'),
  survey_interval_to: yup
    .number()
    .required('Survey interval to is required')
    .positive('Must be positive')
    .test('greater-than-from', 'Survey interval to must be greater than from', function(value) {
      return value > this.parent.survey_interval_from;
    }),
});

export interface TieOnStepProps {
  data: Partial<CreateTieOnInput>;
  onChange: (data: Partial<CreateTieOnInput>) => void;
}

/**
 * TieOnStep Component
 * Step 5 of the complete run creation workflow
 * Collects tie-on point information
 * Based on Story 3.5 AC#5
 */
export const TieOnStep: React.FC<TieOnStepProps> = ({
  data,
  onChange,
}) => {
  const {
    control,
    watch,
    formState: { errors },
  } = useForm<Partial<CreateTieOnInput>>({
    resolver: yupResolver(tieonSchema) as any,
    defaultValues: {
      ...data,
      casing_selected: data.casing_selected !== undefined ? data.casing_selected : false,
      drillpipe_selected: data.drillpipe_selected !== undefined ? data.drillpipe_selected : false,
    },
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
        Tie-On Information
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Provide the tie-on point data for connecting the survey to the wellbore.
      </Typography>

      <Grid container spacing={3}>
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

        {/* Latitude */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="latitude"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Latitude"
                fullWidth
                required
                error={!!errors.latitude}
                helperText={errors.latitude?.message}
                placeholder="e.g., 29.760427"
                inputProps={{ step: '0.000001' }}
              />
            )}
          />
        </Grid>

        {/* Departure */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="departure"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Departure"
                fullWidth
                required
                error={!!errors.departure}
                helperText={errors.departure?.message}
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

        {/* Hole Section */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required error={!!errors.hole_section}>
            <InputLabel id="hole-section-label">Hole Section</InputLabel>
            <Controller
              name="hole_section"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="hole-section-label"
                  label="Hole Section"
                >
                  <MenuItem value="Surface Casing">Surface Casing</MenuItem>
                  <MenuItem value="Intermediate Casing">Intermediate Casing</MenuItem>
                  <MenuItem value="Production Casing">Production Casing</MenuItem>
                  <MenuItem value="Liner">Liner</MenuItem>
                  <MenuItem value="Open Hole">Open Hole</MenuItem>
                </Select>
              )}
            />
            {errors.hole_section && (
              <FormHelperText>{errors.hole_section.message}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* Casing Selected */}
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Controller
                name="casing_selected"
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
            label="Casing Selected"
          />
        </Grid>

        {/* Drillpipe Selected */}
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Controller
                name="drillpipe_selected"
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
            label="Drillpipe Selected"
          />
        </Grid>

        {/* Survey Tool Type */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required error={!!errors.survey_tool_type}>
            <InputLabel id="survey-tool-type-label">Survey Tool Type</InputLabel>
            <Controller
              name="survey_tool_type"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="survey-tool-type-label"
                  label="Survey Tool Type"
                >
                  <MenuItem value="MWD">MWD</MenuItem>
                  <MenuItem value="LWD">LWD</MenuItem>
                  <MenuItem value="Wireline Gyro">Wireline Gyro</MenuItem>
                  <MenuItem value="Steering Tool">Steering Tool</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              )}
            />
            {errors.survey_tool_type && (
              <FormHelperText>{errors.survey_tool_type.message}</FormHelperText>
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
    </>
  );
};
