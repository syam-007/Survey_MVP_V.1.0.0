import React, { useEffect, useState, useMemo } from 'react';
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
  Button,
  Box,
  Paper,
  RadioGroup,
  Radio,
  FormLabel,
} from '@mui/material';
import { GridWrapper as Grid } from './GridWrapper';
import type {
  WellType,
  CreateTieOnInput,
  HoleSectionMaster,
  SurveyRunInMaster,
  MinimumIdMaster,
  SurveyRunInType,
} from '../../../types';
import { fetchHoleSections, fetchSurveyRunIns, fetchMinimumIds } from '../../../services/masterDataService';

/**
 * Validation schema for TieOn step
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
  expected_inclination: yup
    .number()
    .nullable()
    .min(0, 'Expected inclination must be >= 0')
    .max(180, 'Expected inclination must be <= 180'),
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
    setValue,
    formState: { errors },
  } = useForm<Partial<CreateTieOnInput>>({
    resolver: yupResolver(tieonSchema) as any,
    defaultValues: {
      ...data,
    },
    mode: 'onBlur',
  });

  // Master data state
  const [holeSections, setHoleSections] = useState<HoleSectionMaster[]>([]);
  const [surveyRunIns, setSurveyRunIns] = useState<SurveyRunInMaster[]>([]);
  const [minimumIds, setMinimumIds] = useState<MinimumIdMaster[]>([]);
  const [loading, setLoading] = useState(false);

  // Watch form fields for cascading logic
  const formData = watch();
  const selectedHoleSectionId = watch('hole_section_master');
  const selectedRunInType = watch('survey_run_in_type');
  const selectedSurveyRunIn = watch('survey_run_in');
  const surveyIntervalFrom = watch('survey_interval_from');
  const surveyIntervalTo = watch('survey_interval_to');
  const expectedInclination = watch('expected_inclination');

  // Fetch hole sections on mount
  useEffect(() => {
    const loadHoleSections = async () => {
      try {
        const data = await fetchHoleSections();
        setHoleSections(data);
      } catch (error) {
        console.error('Error fetching hole sections:', error);
      }
    };
    loadHoleSections();
  }, []);

  // Fetch survey run-ins when hole section or run-in type changes
  useEffect(() => {
    const loadSurveyRunIns = async () => {
      if (!selectedHoleSectionId || !selectedRunInType) {
        setSurveyRunIns([]);
        return;
      }

      try {
        setLoading(true);
        // Find selected hole section to get its size
        const selectedHoleSection = holeSections.find(
          (hs) => hs.id === selectedHoleSectionId
        );

        if (selectedHoleSection) {
          // Fetch survey run-ins filtered by type and size
          const data = await fetchSurveyRunIns(
            selectedRunInType,
            selectedHoleSection.size_numeric
          );
          setSurveyRunIns(data);
        }
      } catch (error) {
        console.error('Error fetching survey run-ins:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSurveyRunIns();
  }, [selectedHoleSectionId, selectedRunInType, holeSections]);

  // Fetch minimum IDs when survey run-in changes
  useEffect(() => {
    const loadMinimumIds = async () => {
      if (!selectedSurveyRunIn) {
        setMinimumIds([]);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchMinimumIds(selectedSurveyRunIn);
        setMinimumIds(data);
      } catch (error) {
        console.error('Error fetching minimum IDs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMinimumIds();
  }, [selectedSurveyRunIn]);

  // Reset dependent fields when parent selection changes
  useEffect(() => {
    if (!selectedHoleSectionId) {
      setValue('survey_run_in_type', null);
      setValue('survey_run_in', null);
      setValue('minimum_id', null);
    }
  }, [selectedHoleSectionId, setValue]);

  useEffect(() => {
    if (!selectedRunInType) {
      setValue('survey_run_in', null);
      setValue('minimum_id', null);
    }
  }, [selectedRunInType, setValue]);

  useEffect(() => {
    if (!selectedSurveyRunIn) {
      setValue('minimum_id', null);
    }
  }, [selectedSurveyRunIn, setValue]);

  // Auto-calculate survey meterage (survey_interval_to - survey_interval_from)
  const surveyMeterage = useMemo(() => {
    if (surveyIntervalFrom !== undefined && surveyIntervalTo !== undefined) {
      return surveyIntervalTo - surveyIntervalFrom;
    }
    return null;
  }, [surveyIntervalFrom, surveyIntervalTo]);

  // Auto-set well_type based on expected_inclination
  useEffect(() => {
    if (expectedInclination !== undefined && expectedInclination !== null && !isNaN(expectedInclination)) {
      console.log('Expected Inclination:', expectedInclination, 'Type:', typeof expectedInclination);
      if (expectedInclination <= 5) {
        console.log('Setting well type to Vertical');
        setValue('well_type', 'Vertical');
      } else {
        console.log('Setting well type to Deviated');
        setValue('well_type', 'Deviated');
      }
    }
  }, [expectedInclination, setValue]);

  // Update parent on change
  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  // Handle Tie-On From Surface button click - set all tie-on values to zero
  const handleTieOnFromSurface = () => {
    setValue('md', 0);
    setValue('inc', 0);
    setValue('azi', 0);
    setValue('tvd', 0);
    setValue('latitude', 0);
    setValue('departure', 0);
  };

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Tie-On and Survey Information
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Provide the tie-on point data and survey configuration information.
      </Typography>

      <Grid container spacing={3}>
        {/* Left Side: Tie-On Information */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Tie-On Information
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={handleTieOnFromSurface}
                sx={{ textTransform: 'none' }}
              >
                Tie-On From Surface
              </Button>
            </Box>

            <Grid container spacing={2}>
              {/* MD */}
              <Grid item xs={12}>
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
              <Grid item xs={12}>
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
              <Grid item xs={12}>
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
              <Grid item xs={12}>
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
              <Grid item xs={12}>
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
              <Grid item xs={12}>
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
            </Grid>
          </Paper>
        </Grid>

        {/* Right Side: Survey Information */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
              Survey Information
            </Typography>

            <Grid container spacing={2}>
              {/* Expected Inclination */}
              <Grid item xs={12}>
                <Controller
                  name="expected_inclination"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === null) {
                          field.onChange(null);
                        } else {
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue)) {
                            field.onChange(numValue);
                          }
                        }
                      }}
                      type="number"
                      label="Expected Inclination"
                      fullWidth
                      error={!!errors.expected_inclination}
                      helperText={
                        errors.expected_inclination?.message ||
                        'Enter expected inclination (≤5° = Vertical, >5° = Deviated)'
                      }
                      placeholder="e.g., 3.5"
                      inputProps={{ step: '0.01', min: 0, max: 180 }}
                    />
                  )}
                />
              </Grid>

              {/* Well Type - Auto-set based on Expected Inclination */}
              <Grid item xs={12}>
                <FormControl fullWidth required error={!!errors.well_type}>
                  <InputLabel id="well-type-label">Well Type</InputLabel>
                  <Controller
                    name="well_type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        value={field.value || ''}
                        labelId="well-type-label"
                        label="Well Type"
                        disabled={expectedInclination !== undefined && expectedInclination !== null && !isNaN(expectedInclination)}
                      >
                        <MenuItem value="Vertical">Vertical</MenuItem>
                        <MenuItem value="Deviated">Deviated</MenuItem>
                        <MenuItem value="Horizontal">Horizontal</MenuItem>
                      </Select>
                    )}
                  />
                  {errors.well_type && (
                    <FormHelperText error>{errors.well_type.message}</FormHelperText>
                  )}
                  {expectedInclination !== undefined && expectedInclination !== null && !isNaN(expectedInclination) && (
                    <FormHelperText>
                      Auto-set based on expected inclination ({expectedInclination}°)
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Hole Section Master */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="hole-section-master-label">Hole Section (Master)</InputLabel>
                  <Controller
                    name="hole_section_master"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        labelId="hole-section-master-label"
                        label="Hole Section (Master)"
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {holeSections.map((hs) => (
                          <MenuItem key={hs.id} value={hs.id}>
                            {hs.hole_section_name}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                  <FormHelperText>Select hole section to enable run-in selection</FormHelperText>
                </FormControl>
              </Grid>

              {/* Survey Run-In Type (Radio buttons) */}
              {selectedHoleSectionId && (
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Survey Run-In Type</FormLabel>
                    <Controller
                      name="survey_run_in_type"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          row
                        >
                          <FormControlLabel value="casing" control={<Radio />} label="Casing" />
                          <FormControlLabel value="drill_pipe" control={<Radio />} label="Drill Pipe" />
                          <FormControlLabel value="tubing" control={<Radio />} label="Tubing" />
                        </RadioGroup>
                      )}
                    />
                  </FormControl>
                </Grid>
              )}

              {/* Survey Run-In */}
              {selectedRunInType && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="survey-run-in-label">Survey Run-In</InputLabel>
                    <Controller
                      name="survey_run_in"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          labelId="survey-run-in-label"
                          label="Survey Run-In"
                          disabled={loading || surveyRunIns.length === 0}
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {surveyRunIns.map((sri) => (
                            <MenuItem key={sri.id} value={sri.id}>
                              {sri.run_in_name}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                    <FormHelperText>
                      {loading
                        ? 'Loading...'
                        : surveyRunIns.length === 0
                        ? 'No run-ins available for selected type and size'
                        : `Showing ${selectedRunInType} run-ins below hole section size`}
                    </FormHelperText>
                  </FormControl>
                </Grid>
              )}

              {/* Minimum ID */}
              {selectedSurveyRunIn && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="minimum-id-label">Minimum ID</InputLabel>
                    <Controller
                      name="minimum_id"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          labelId="minimum-id-label"
                          label="Minimum ID"
                          disabled={loading || minimumIds.length === 0}
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {minimumIds.map((mid) => (
                            <MenuItem key={mid.id} value={mid.id}>
                              {mid.minimum_id_name}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                    <FormHelperText>
                      {loading
                        ? 'Loading...'
                        : minimumIds.length === 0
                        ? 'No minimum IDs available for selected run-in'
                        : 'Select minimum ID for survey run-in'}
                    </FormHelperText>
                  </FormControl>
                </Grid>
              )}

              {/* Survey Interval From */}
              <Grid item xs={12}>
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
              <Grid item xs={12}>
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

              {/* Survey Meterage - Auto-calculated */}
              <Grid item xs={12}>
                <TextField
                  label="Survey Meterage"
                  fullWidth
                  value={surveyMeterage !== null ? surveyMeterage.toFixed(3) : ''}
                  disabled
                  InputProps={{
                    readOnly: true,
                  }}
                  helperText="Auto-calculated: Survey Interval To - Survey Interval From"
                  placeholder="Auto-calculated"
                />
              </Grid>
            </Grid>
          </Paper>
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
