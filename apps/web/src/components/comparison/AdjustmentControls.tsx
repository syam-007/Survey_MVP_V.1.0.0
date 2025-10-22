/**
 * Adjustment Controls Component
 *
 * Provides UI controls for adjusting comparative survey curves.
 * Supports offset application, undo/redo, reset, and recalculation.
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Undo as UndoIcon,
  Redo as RedoIcon,
  RestartAlt as ResetIcon,
  Calculate as CalculateIcon,
  CheckCircle as ApplyIcon,
} from '@mui/icons-material';
import type { ComparisonResult } from '../../types/comparison.types';
import type { AdjustmentState } from '../../types/adjustment.types';
import {
  useCurrentAdjustment,
  useApplyOffset,
  useUndoAdjustment,
  useRedoAdjustment,
  useResetAdjustments,
  useRecalculateIncAzi,
} from '../../hooks/useAdjustment';

interface AdjustmentControlsProps {
  comparison: ComparisonResult;
  onAdjustmentChange?: (adjustment: AdjustmentState) => void;
}

export const AdjustmentControls: React.FC<AdjustmentControlsProps> = ({
  comparison,
  onAdjustmentChange,
}) => {
  const comparisonId = comparison.id;

  // Get current adjustment state
  const { data: currentAdjustment, isLoading } = useCurrentAdjustment(comparisonId);

  // Mutation hooks
  const { applyOffset, isApplying } = useApplyOffset();
  const { undoAdjustment, isUndoing } = useUndoAdjustment();
  const { redoAdjustment, isRedoing } = useRedoAdjustment();
  const { resetAdjustments, isResetting } = useResetAdjustments();
  const { recalculateIncAzi, isRecalculating } = useRecalculateIncAzi();

  // Form state
  const [mdStart, setMdStart] = useState<number>(0);
  const [mdEnd, setMdEnd] = useState<number>(0);
  const [xOffset, setXOffset] = useState<number>(0);
  const [yOffset, setYOffset] = useState<number>(0);
  const [zOffset, setZOffset] = useState<number>(0);

  // Success/error messages
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Initialize MD range from comparison data
  useEffect(() => {
    if (comparison.md_data && comparison.md_data.length > 0) {
      setMdStart(comparison.md_data[0]);
      setMdEnd(comparison.md_data[comparison.md_data.length - 1]);
    }
  }, [comparison]);

  // Notify parent when adjustment changes
  useEffect(() => {
    if (currentAdjustment && onAdjustmentChange) {
      onAdjustmentChange(currentAdjustment);
    }
  }, [currentAdjustment, onAdjustmentChange]);

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleApplyOffset = async () => {
    clearMessages();
    try {
      const result = await applyOffset({
        comparisonId,
        offsetData: {
          md_start: mdStart,
          md_end: mdEnd,
          x_offset: xOffset,
          y_offset: yOffset,
          z_offset: zOffset,
        },
      });
      setSuccessMessage(
        `Offset applied! ${result.points_affected || 0} points affected. (Sequence: ${result.sequence})`
      );
      // Reset offset inputs
      setXOffset(0);
      setYOffset(0);
      setZOffset(0);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to apply offset');
    }
  };

  const handleUndo = async () => {
    clearMessages();
    try {
      const result = await undoAdjustment(comparisonId);
      setSuccessMessage(result.message || 'Adjustment undone successfully');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to undo adjustment');
    }
  };

  const handleRedo = async () => {
    clearMessages();
    try {
      const result = await redoAdjustment(comparisonId);
      setSuccessMessage(result.message || 'Adjustment redone successfully');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to redo adjustment');
    }
  };

  const handleReset = async () => {
    clearMessages();
    try {
      const result = await resetAdjustments(comparisonId);
      setSuccessMessage(result.message || 'All adjustments reset to original');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to reset adjustments');
    }
  };

  const handleRecalculate = async () => {
    clearMessages();
    try {
      await recalculateIncAzi(comparisonId);
      setSuccessMessage('INC and AZI recalculated from adjusted path');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to recalculate INC/AZI');
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  const isProcessing = isApplying || isUndoing || isRedoing || isResetting || isRecalculating;

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom fontWeight="medium">
        Adjust Comparative Survey
      </Typography>

      {/* Status Display */}
      {currentAdjustment && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Current State: {currentAdjustment.has_adjustment ? (
            <>
              Adjustment Sequence {currentAdjustment.sequence} applied
            </>
          ) : (
            'Original survey (no adjustments)'
          )}
        </Alert>
      )}

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert severity="success" onClose={clearMessages} sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert severity="error" onClose={clearMessages} sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* MD Range Inputs */}
      <Typography variant="subtitle2" gutterBottom fontWeight="medium">
        MD Range for Offset
      </Typography>
      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          label="Start MD (m)"
          type="number"
          value={mdStart}
          onChange={(e) => setMdStart(parseFloat(e.target.value))}
          size="small"
          fullWidth
          disabled={isProcessing}
        />
        <TextField
          label="End MD (m)"
          type="number"
          value={mdEnd}
          onChange={(e) => setMdEnd(parseFloat(e.target.value))}
          size="small"
          fullWidth
          disabled={isProcessing}
        />
      </Stack>

      {/* Offset Inputs */}
      <Typography variant="subtitle2" gutterBottom fontWeight="medium">
        Offset Values (meters)
      </Typography>
      <Stack spacing={2} mb={3}>
        <TextField
          label="Easting (X) Offset"
          type="number"
          value={xOffset}
          onChange={(e) => setXOffset(parseFloat(e.target.value) || 0)}
          size="small"
          fullWidth
          disabled={isProcessing}
          inputProps={{ step: 0.1 }}
        />
        <TextField
          label="Northing (Y) Offset"
          type="number"
          value={yOffset}
          onChange={(e) => setYOffset(parseFloat(e.target.value) || 0)}
          size="small"
          fullWidth
          disabled={isProcessing}
          inputProps={{ step: 0.1 }}
        />
        <TextField
          label="TVD (Z) Offset"
          type="number"
          value={zOffset}
          onChange={(e) => setZOffset(parseFloat(e.target.value) || 0)}
          size="small"
          fullWidth
          disabled={isProcessing}
          inputProps={{ step: 0.1 }}
        />
      </Stack>

      {/* Apply Button */}
      <Button
        variant="contained"
        color="primary"
        fullWidth
        startIcon={isApplying ? <CircularProgress size={20} /> : <ApplyIcon />}
        onClick={handleApplyOffset}
        disabled={isProcessing}
        sx={{ mb: 2 }}
      >
        {isApplying ? 'Applying...' : 'Apply Offsets'}
      </Button>

      {/* History Controls */}
      <Typography variant="subtitle2" gutterBottom fontWeight="medium">
        History Controls
      </Typography>
      <Stack direction="row" spacing={1} mb={2}>
        <Tooltip title="Undo last change">
          <span>
            <IconButton
              onClick={handleUndo}
              disabled={isProcessing || !currentAdjustment?.has_adjustment}
              color="primary"
            >
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo (forward)">
          <span>
            <IconButton
              onClick={handleRedo}
              disabled={isProcessing}
              color="primary"
            >
              <RedoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Reset to original">
          <span>
            <IconButton
              onClick={handleReset}
              disabled={isProcessing || !currentAdjustment?.has_adjustment}
              color="warning"
            >
              <ResetIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Recalculate Button */}
      <Button
        variant="outlined"
        color="secondary"
        fullWidth
        startIcon={isRecalculating ? <CircularProgress size={20} /> : <CalculateIcon />}
        onClick={handleRecalculate}
        disabled={isProcessing || !currentAdjustment?.has_adjustment}
      >
        {isRecalculating ? 'Recalculating...' : 'Recalculate INC/AZI from Path'}
      </Button>

      {/* Help Text */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Apply offsets to adjust the comparative survey within the specified MD range.
        Offsets are cumulative and can be undone/redone.
      </Typography>
    </Paper>
  );
};
