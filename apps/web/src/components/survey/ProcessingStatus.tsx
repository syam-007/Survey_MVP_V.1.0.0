/**
 * ProcessingStatus Component
 *
 * Displays real-time survey processing status with a stepper UI.
 * Polls for status updates and shows progress through different stages.
 */
import React, { useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Typography,
  Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useSurveyStatus } from '../../hooks/useSurveyStatus';

interface ProcessingStatusProps {
  surveyDataId: string;
  onComplete: () => void;
  onError: (error: string) => void;
}

const PROCESSING_STEPS = [
  'Uploading',
  'Validating',
  'Calculating',
  'Interpolating',
  'Complete'
];

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  surveyDataId,
  onComplete,
  onError
}) => {
  const { status, isLoading, error } = useSurveyStatus(surveyDataId);

  useEffect(() => {
    if (status === 'complete') {
      onComplete();
    } else if (status === 'error' || error) {
      onError(error || 'Processing failed');
    }
  }, [status, error, onComplete, onError]);

  const getCurrentStep = (): number => {
    switch (status) {
      case 'uploading':
        return 0;
      case 'validating':
        return 1;
      case 'calculating':
        return 2;
      case 'interpolating':
        return 3;
      case 'complete':
        return 4;
      default:
        return 0;
    }
  };

  const activeStep = getCurrentStep();

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom textAlign="center">
        Processing Survey Data
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mt: 4 }}>
        {PROCESSING_STEPS.map((label, index) => {
          const isError = status === 'error' && index === activeStep;
          const isComplete = index < activeStep || status === 'complete';

          return (
            <Step key={label}>
              <StepLabel
                error={isError}
                StepIconComponent={() => {
                  if (isError) {
                    return <ErrorIcon color="error" />;
                  } else if (isComplete) {
                    return <CheckCircleIcon color="success" />;
                  } else if (index === activeStep) {
                    return <CircularProgress size={24} />;
                  }
                  return null;
                }}
              >
                {label}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>

      {isLoading && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            {PROCESSING_STEPS[activeStep]}...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};
