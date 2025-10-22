/**
 * DataSourceToggle component - Toggle between calculated and interpolated survey data.
 */
import React from 'react';
import { ToggleButton, ToggleButtonGroup, Box, Typography } from '@mui/material';
import type { DataSource } from './types';

interface DataSourceToggleProps {
  value: DataSource;
  onChange: (source: DataSource) => void;
  calculatedCount: number;
  interpolatedCount: number;
  disabled?: boolean;
}

export const DataSourceToggle: React.FC<DataSourceToggleProps> = ({
  value,
  onChange,
  calculatedCount,
  interpolatedCount,
  disabled = false,
}) => {
  const handleChange = (_event: React.MouseEvent<HTMLElement>, newValue: DataSource | null) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="body2" fontWeight="medium">
        Data Source:
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={handleChange}
        disabled={disabled}
        aria-label="survey data source"
        size="small"
      >
        <ToggleButton value="calculated" aria-label="calculated data">
          Calculated ({calculatedCount} points)
        </ToggleButton>
        <ToggleButton value="interpolated" aria-label="interpolated data">
          Interpolated ({interpolatedCount} points)
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};
