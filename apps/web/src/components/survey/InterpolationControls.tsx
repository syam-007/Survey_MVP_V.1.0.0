/**
 * InterpolationControls Component
 *
 * Provides controls for configuring and saving interpolated survey data.
 */
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import surveysService from '../../services/surveysService';

interface InterpolationControlsProps {
  calculatedSurveyId: string | null;
  currentResolution: number;
  onResolutionChange: (resolution: number) => void;
  onInterpolationComplete: () => void;
}

export const InterpolationControls: React.FC<InterpolationControlsProps> = ({
  calculatedSurveyId,
  currentResolution,
  onResolutionChange,
  onInterpolationComplete,
}) => {
  const [resolution, setResolution] = useState(currentResolution);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCalculate = async () => {
    if (!calculatedSurveyId) {
      setError('No calculated survey available');
      return;
    }

    if (resolution < 1 || resolution > 100) {
      setError('Resolution must be between 1 and 100 meters');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const result = await surveysService.triggerInterpolation(calculatedSurveyId, resolution);

      setSuccessMessage(
        result.message || `Interpolation completed: ${result.point_count} points generated`
      );

      // Update the resolution in parent to trigger data fetch
      onResolutionChange(resolution);
      onInterpolationComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to calculate interpolation');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!calculatedSurveyId) {
      setError('No calculated survey available');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // The interpolation is already saved when calculated
      // Just show confirmation message
      setSuccessMessage('Interpolation data is already saved in the database');
    } catch (err: any) {
      setError(err.message || 'Failed to save interpolation');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Interpolation Controls
      </Typography>

      <Typography variant="body2" color="text.secondary" paragraph>
        Adjust the resolution to interpolate survey data at different intervals.
        Lower values create more points, higher values create fewer points.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField
          label="Resolution (meters)"
          type="number"
          value={resolution}
          onChange={(e) => setResolution(Number(e.target.value))}
          inputProps={{ min: 1, max: 100, step: 1 }}
          sx={{ width: 200 }}
          helperText="1-100 meters"
          size="small"
        />

        <Button
          variant="contained"
          startIcon={isCalculating ? <CircularProgress size={20} /> : <CalculateIcon />}
          onClick={handleCalculate}
          disabled={isCalculating || isSaving || !calculatedSurveyId}
        >
          {isCalculating ? 'Calculating...' : 'Calculate Interpolation'}
        </Button>

        <Button
          variant="outlined"
          startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={isCalculating || isSaving || !calculatedSurveyId || resolution !== currentResolution}
          color="success"
        >
          {isSaving ? 'Saving...' : 'Save to Database'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};
