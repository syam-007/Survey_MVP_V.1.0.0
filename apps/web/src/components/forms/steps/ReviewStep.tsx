import React from 'react';
import {
  Typography,
  Paper,
  Box,
  Divider,
  Chip,
} from '@mui/material';
import { GridWrapper as Grid } from './GridWrapper';
import type { CompleteRunFormData } from '../CompleteRunForm';

export interface ReviewStepProps {
  data: CompleteRunFormData;
}

/**
 * ReviewStep Component
 * Step 6 (final step) of the complete run creation workflow
 * Shows a summary of all collected data before submission
 * Based on Story 3.5 AC#6
 */
export const ReviewStep: React.FC<ReviewStepProps> = ({ data }) => {
  const renderSectionHeader = (title: string) => (
    <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, fontWeight: 600 }}>
      {title}
    </Typography>
  );

  const renderField = (label: string, value: any, isChip: boolean = false) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return (
      <Grid item xs={12} sm={6}>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        {isChip ? (
          <Chip label={value} size="small" color="primary" sx={{ mt: 0.5 }} />
        ) : (
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
          </Typography>
        )}
      </Grid>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Review Your Submission
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Please review all the information below before submitting. You can go back to any step to make changes.
      </Typography>

      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        {/* Run Info Section */}
        {renderSectionHeader('1. Run Information')}
        <Grid container spacing={2}>
          {renderField('Run Number', data.run.run_number)}
          {renderField('Run Name', data.run.run_name)}
          {renderField('Run Type', data.run.run_type, true)}
          {renderField('Well ID', data.run.well)}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Location Section */}
        {renderSectionHeader('2. Location Information')}
        <Grid container spacing={2}>
          {renderField('Latitude', data.location.latitude)}
          {renderField('Longitude', data.location.longitude)}
          {renderField('Geodetic System', data.location.geodetic_system, true)}
          {renderField('Map Zone', data.location.map_zone)}
          {renderField('North Reference', data.location.north_reference, true)}
          {renderField('Central Meridian', data.location.central_meridian)}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Depth Section */}
        {renderSectionHeader('3. Depth Information')}
        <Grid container spacing={2}>
          {renderField('Elevation Reference', data.depth.elevation_reference, true)}
          {renderField('Reference Datum', data.depth.reference_datum)}
          {renderField('Reference Height', data.depth.reference_height)}
          {renderField('Reference Elevation', data.depth.reference_elevation)}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Survey Section */}
        {renderSectionHeader('4. Survey Information')}
        <Grid container spacing={2}>
          {renderField('Survey Type', data.survey.survey_type, true)}
          {renderField('File Path', data.survey.file_path)}
          {data.survey.required_columns && (
            <>
              {renderField('MD Column', data.survey.required_columns.md)}
              {renderField('INC Column', data.survey.required_columns.inc)}
              {renderField('AZI Column', data.survey.required_columns.azi)}
            </>
          )}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Tie-On Section */}
        {renderSectionHeader('5. Tie-On Information')}
        <Grid container spacing={2}>
          {renderField('Measured Depth (MD)', data.tieon.md)}
          {renderField('Inclination (INC)', data.tieon.inc)}
          {renderField('Azimuth (AZI)', data.tieon.azi)}
          {renderField('True Vertical Depth (TVD)', data.tieon.tvd)}
          {renderField('Latitude', data.tieon.latitude)}
          {renderField('Departure', data.tieon.departure)}
          {renderField('Well Type', data.tieon.well_type, true)}
          {renderField('Hole Section', data.tieon.hole_section, true)}
          {renderField('Casing Selected', data.tieon.casing_selected)}
          {renderField('Drillpipe Selected', data.tieon.drillpipe_selected)}
          {renderField('Survey Tool Type', data.tieon.survey_tool_type, true)}
          {renderField('Survey Interval From', data.tieon.survey_interval_from)}
          {renderField('Survey Interval To', data.tieon.survey_interval_to)}
        </Grid>
      </Paper>

      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        Click "Submit" below to create the complete run with all information. All resources will be created and linked together.
      </Typography>
    </Box>
  );
};
