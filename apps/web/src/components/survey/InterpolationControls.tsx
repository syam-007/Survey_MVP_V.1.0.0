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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import surveysService from '../../services/surveysService';

interface InterpolationControlsProps {
  calculatedSurveyId: string | null;
  currentResolution: number;
  isSaved: boolean;
  tieOnMD: number;
  finalMD: number;
  onResolutionChange: (resolution: number, startMD?: number, endMD?: number) => void;
  onInterpolationComplete: () => void;
}

export const InterpolationControls: React.FC<InterpolationControlsProps> = ({
  calculatedSurveyId,
  currentResolution,
  isSaved,
  tieOnMD,
  finalMD,
  onResolutionChange,
  onInterpolationComplete,
}) => {
  const [resolution, setResolution] = useState<number | ''>(currentResolution);
  const [startPoint, setStartPoint] = useState<number | ''>(tieOnMD + currentResolution);
  const [endPoint, setEndPoint] = useState<number | ''>(finalMD);
  const [autoFillEndPoint, setAutoFillEndPoint] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Update start point when resolution changes
  React.useEffect(() => {
    const resolutionNum = Number(resolution);
    if (!isNaN(resolutionNum) && resolutionNum > 0) {
      setStartPoint(tieOnMD + resolutionNum);
    }
  }, [resolution, tieOnMD]);

  // Update end point when auto-fill is enabled or finalMD changes
  React.useEffect(() => {
    if (autoFillEndPoint) {
      setEndPoint(finalMD);
    }
  }, [autoFillEndPoint, finalMD]);

  const handleApplyResolution = () => {
    // Convert to numbers for validation
    const resolutionNum = Number(resolution);
    const startPointNum = Number(startPoint);
    const endPointNum = Number(endPoint);

    // Validate inputs
    if (isNaN(resolutionNum) || resolution === '') {
      setError('Resolution is required');
      return;
    }

    if (resolutionNum < 1 || resolutionNum > 100) {
      setError('Resolution must be between 1 and 100 meters');
      return;
    }

    if (isNaN(startPointNum) || startPoint === '') {
      setError('Start point is required');
      return;
    }

    if (isNaN(endPointNum) || endPoint === '') {
      setError('End point is required');
      return;
    }

    if (startPointNum < tieOnMD) {
      setError(`Start point must be greater than or equal to tie-on MD (${tieOnMD}m)`);
      return;
    }

    if (endPointNum > finalMD) {
      setError(`End point cannot exceed final MD (${finalMD}m)`);
      return;
    }

    if (startPointNum >= endPointNum) {
      setError('Start point must be less than end point');
      return;
    }

    // Update the resolution with custom start/end points
    onResolutionChange(resolutionNum, startPointNum, endPointNum);
  };

  const handleSave = async () => {
    if (!calculatedSurveyId) {
      setError('No calculated survey available');
      return;
    }

    // Convert to numbers
    const startPointNum = Number(startPoint);
    const endPointNum = Number(endPoint);

    if (isNaN(startPointNum) || startPoint === '' || isNaN(endPointNum) || endPoint === '') {
      setError('Please provide valid start and end points');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await surveysService.saveInterpolation(
        calculatedSurveyId,
        currentResolution,
        startPointNum,
        endPointNum
      );

      setSuccessMessage(
        result.message || 'Interpolation saved to database successfully'
      );

      // Refetch to update is_saved flag
      onInterpolationComplete();
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
        Configure interpolation parameters including resolution and MD range.
        The interpolation will generate points at regular intervals between start and end points.
        {!isSaved && (
          <Typography component="span" color="warning.main" sx={{ display: 'block', mt: 1, fontWeight: 'medium' }}>
            ⚠️ This interpolation is not saved to database. Click "Save to Database" to persist it.
          </Typography>
        )}
      </Typography>

      {/* Input Fields Row */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap', mb: 2 }}>
        <TextField
          label="Resolution (meters)"
          type="number"
          value={resolution}
          onChange={(e) => {
            const value = e.target.value;
            setResolution(value === '' ? '' : Number(value));
          }}
          inputProps={{ min: 1, max: 100, step: 1 }}
          sx={{ width: 180 }}
          helperText="1-100 meters"
          size="small"
        />

        <TextField
          label="Start Point (MD)"
          type="number"
          value={startPoint}
          onChange={(e) => {
            const value = e.target.value;
            setStartPoint(value === '' ? '' : Number(value));
          }}
          inputProps={{ min: tieOnMD, max: finalMD, step: 0.1 }}
          sx={{ width: 180 }}
          helperText={`Min: ${tieOnMD.toFixed(2)}m`}
          size="small"
        />

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <TextField
            label="End Point (MD)"
            type="number"
            value={endPoint}
            onChange={(e) => {
              const value = e.target.value;
              setEndPoint(value === '' ? '' : Number(value));
            }}
            inputProps={{ min: tieOnMD, max: finalMD, step: 0.1 }}
            sx={{ width: 180 }}
            helperText={`Max: ${finalMD.toFixed(2)}m`}
            size="small"
            disabled={autoFillEndPoint}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={autoFillEndPoint}
                onChange={(e) => setAutoFillEndPoint(e.target.checked)}
                size="small"
              />
            }
            label="Auto"
            sx={{ mt: 1 }}
          />
        </Box>
      </Box>

      {/* Action Buttons Row */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<CalculateIcon />}
          onClick={handleApplyResolution}
          disabled={isSaving || !calculatedSurveyId}
        >
          Apply Interpolation
        </Button>

        <Button
          variant={isSaved ? "outlined" : "contained"}
          startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={isSaving || !calculatedSurveyId || isSaved}
          color="success"
        >
          {isSaving ? 'Saving...' : isSaved ? 'Already Saved' : 'Save to Database'}
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
