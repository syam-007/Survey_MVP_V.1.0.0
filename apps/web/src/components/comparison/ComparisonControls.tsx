/**
 * ComparisonControls Component
 *
 * Interpolation resolution control for survey comparison.
 */
import React from 'react';
import {
  Box,
  Typography,
  Slider,
  TextField,
  Paper,
  Stack,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';

interface ComparisonControlsProps {
  ratioFactor: number;
  onRatioFactorChange: (value: number) => void;
  disabled?: boolean;
}

export const ComparisonControls: React.FC<ComparisonControlsProps> = ({
  ratioFactor,
  onRatioFactorChange,
  disabled = false,
}) => {
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    onRatioFactorChange(newValue as number);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === '' ? 5 : Number(event.target.value);
    if (value >= 1 && value <= 100) {
      onRatioFactorChange(value);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
      <Stack spacing={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="subtitle1" fontWeight="medium">
            Interpolation Resolution (meters)
          </Typography>
          <Tooltip
            title="Interpolation step size in meters. Lower values = more interpolated points and finer resolution. Range: 1-100m. Default: 5m."
            arrow
          >
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box display="flex" alignItems="center" gap={3}>
          <Box sx={{ flex: 1 }}>
            <Slider
              value={ratioFactor}
              onChange={handleSliderChange}
              min={1}
              max={100}
              step={1}
              marks={[
                { value: 1, label: '1m' },
                { value: 5, label: '5m' },
                { value: 10, label: '10m' },
                { value: 50, label: '50m' },
                { value: 100, label: '100m' },
              ]}
              disabled={disabled}
              valueLabelDisplay="auto"
              sx={{ mt: 1 }}
            />
          </Box>

          <TextField
            value={ratioFactor}
            onChange={handleInputChange}
            size="small"
            type="number"
            inputProps={{
              min: 1,
              max: 100,
              step: 1,
            }}
            disabled={disabled}
            sx={{ width: 80 }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary">
          With {ratioFactor}m resolution, surveys will be interpolated to common MD stations every {ratioFactor} meters.
        </Typography>
      </Stack>
    </Paper>
  );
};
