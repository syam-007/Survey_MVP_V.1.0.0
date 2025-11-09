import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  Typography,
  Alert,
  AlertTitle,
} from '@mui/material';
import type {
  CreateRunInput,
  CreateLocationInput,
  CreateDepthInput,
  CreateSurveyInput,
  CreateTieOnInput,
} from '../../types';
import { RunInfoStep } from './steps/RunInfoStep';
import { LocationStep } from './steps/LocationStep';
import { DepthStep } from './steps/DepthStep';
import { TieOnStep } from './steps/TieOnStep';
import { ReviewStep } from './steps/ReviewStep';

/**
 * Form data structure for the complete run creation workflow
 */
export interface CompleteRunFormData {
  run: Partial<CreateRunInput>;
  location: Partial<CreateLocationInput>;
  depth: Partial<CreateDepthInput>;
  survey: Partial<CreateSurveyInput>;
  tieon: Partial<CreateTieOnInput>;
}

/**
 * Props for CompleteRunForm component
 */
export interface CompleteRunFormProps {
  onSubmit: (data: CompleteRunFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: Partial<CompleteRunFormData>;
  wells?: any[]; // Full Well objects
  error?: Error | null;
}

/**
 * Multi-step form steps configuration
 */
const STEPS = [
  'Run Info',
  'Location',
  'Depth',
  'Tie-On',
  'Review & Submit',
];

const STORAGE_KEY = 'complete_run_form_draft';

/**
 * CompleteRunForm Component
 * Multi-step form for creating a complete run with all required information
 * Based on Story 3.5 - Frontend Integration: Complete Run Creation Workflow
 */
export const CompleteRunForm: React.FC<CompleteRunFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData,
  wells = [],
  error = null,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<CompleteRunFormData>(() => {
    // Try to load from localStorage on mount
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved form data:', e);
      }
    }
    return {
      run: initialData?.run || {},
      location: initialData?.location || {},
      depth: initialData?.depth || {},
      survey: initialData?.survey || {},
      tieon: initialData?.tieon || {},
    };
  });

  // Auto-save form data to localStorage whenever it changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [formData]);

  /**
   * Update form data for a specific step
   * Memoized to prevent infinite loops in child components
   */
  const updateStepData = useCallback((
    step: keyof CompleteRunFormData,
    data: Partial<CompleteRunFormData[typeof step]>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [step]: { ...prev[step], ...data },
    }));
  }, []);

  // Memoize individual step callbacks
  const handleRunChange = useCallback((data: Partial<CreateRunInput>) => {
    updateStepData('run', data);
  }, [updateStepData]);

  const handleLocationChange = useCallback((data: Partial<CreateLocationInput>) => {
    updateStepData('location', data);
  }, [updateStepData]);

  const handleDepthChange = useCallback((data: Partial<CreateDepthInput>) => {
    updateStepData('depth', data);
  }, [updateStepData]);

  const handleSurveyChange = useCallback((data: Partial<CreateSurveyInput>) => {
    updateStepData('survey', data);
  }, [updateStepData]);

  const handleTieOnChange = useCallback((data: Partial<CreateTieOnInput>) => {
    updateStepData('tieon', data);
  }, [updateStepData]);

  /**
   * Handle navigation to next step
   */
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  /**
   * Handle navigation to previous step
   */
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    try {
      await onSubmit(formData);
      // Clear draft from localStorage on successful submission
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Form submission failed:', error);
      throw error;
    }
  };

  /**
   * Clear draft and cancel
   */
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Your progress will be lost.')) {
      localStorage.removeItem(STORAGE_KEY);
      onCancel();
    }
  };

  /**
   * Render step content based on active step
   */
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        // Step 1: Run Info
        return (
          <RunInfoStep
            data={formData.run}
            onChange={handleRunChange}
            wells={wells}
          />
        );
      case 1:
        // Step 2: Location Form
        return (
          <LocationStep
            data={formData.location}
            onChange={handleLocationChange}
            wellId={formData.run.well}
          />
        );
      case 2:
        // Step 3: Depth Form
        return (
          <DepthStep
            data={formData.depth}
            onChange={handleDepthChange}
            wellId={formData.run.well}
          />
        );
      case 3:
        // Step 4: Tie-On Form
        return (
          <TieOnStep
            data={formData.tieon}
            onChange={handleTieOnChange}
          />
        );
      case 4:
        // Step 5: Review & Submit
        return (
          <Box>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                <AlertTitle>Submission Failed</AlertTitle>
                {parseErrorMessage(error)}
              </Alert>
            )}
            <ReviewStep data={formData} />
          </Box>
        );
      default:
        return null;
    }
  };

  /**
   * Parse error message to extract field-specific errors
   */
  const parseErrorMessage = (error: Error): React.ReactNode => {
    try {
      // Try to parse if error message contains JSON-like structure
      const message = error.message;

      // Check if message contains field errors (e.g., "run_number:")
      if (message.includes(':')) {
        const parts = message.split(';').map(part => part.trim()).filter(Boolean);
        if (parts.length > 0) {
          return (
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {parts.map((part, index) => (
                <li key={index}>{part}</li>
              ))}
            </Box>
          );
        }
      }

      return message;
    } catch (e) {
      return error.message;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Form Content */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        {renderStepContent(activeStep)}
      </Paper>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            disabled={activeStep === 0 || isSubmitting}
            onClick={handleBack}
          >
            Back
          </Button>

          {activeStep === STEPS.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              Next
            </Button>
          )}
        </Box>
      </Box>

      {/* Draft Save Indicator */}
      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 2, textAlign: 'center', color: 'text.secondary' }}
      >
        Your progress is automatically saved
      </Typography>
    </Box>
  );
};
