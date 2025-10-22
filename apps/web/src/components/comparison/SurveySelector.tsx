/**
 * SurveySelector Component
 *
 * Dropdown selector for choosing surveys in comparison workflow.
 */
import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { format } from 'date-fns';

interface Survey {
  id: string;
  survey_data_id?: string;
  filename: string;
  survey_type: string;
  upload_date: string;
  file_size: number;
  processing_status: string;
  survey_role?: string;
}

interface SurveySelectorProps {
  label: string;
  surveys: Survey[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const SurveySelector: React.FC<SurveySelectorProps> = ({
  label,
  surveys,
  value,
  onChange,
  disabled = false,
}) => {
  const getSurveyTypeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'GTL':
        return 'primary';
      case 'GYRO':
        return 'secondary';
      case 'MWD':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label={label}
        renderValue={(selected) => {
          const survey = surveys.find((s) => s.survey_data_id === selected);
          return survey ? survey.filename : '';
        }}
      >
        <MenuItem value="">
          <em>Select a survey</em>
        </MenuItem>
        {surveys.map((survey) => (
          <MenuItem key={survey.id} value={survey.survey_data_id || ''}>
            <Box sx={{ width: '100%', py: 0.5 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="body1" fontWeight="medium">
                  {survey.filename}
                </Typography>
                <Chip
                  label={survey.survey_type}
                  color={getSurveyTypeColor(survey.survey_type) as any}
                  size="small"
                />
              </Box>
              <Box display="flex" gap={2}>
                <Typography variant="caption" color="text.secondary">
                  Uploaded: {format(new Date(survey.upload_date), 'MMM dd, yyyy')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Size: {(survey.file_size / 1024).toFixed(1)} KB
                </Typography>
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
