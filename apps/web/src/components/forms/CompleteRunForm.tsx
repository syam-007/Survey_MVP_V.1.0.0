import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  Typography,
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
import { SurveyStep } from './steps/SurveyStep';
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
  wells?: Array<{ id: string; well_name: string }>;
}

/**
 * Multi-step form steps configuration
 */
const STEPS = [
  'Run Info',
  'Location',
  'Depth',
  'Survey Type',
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
   */
  const updateStepData = (
    step: keyof CompleteRunFormData,
    data: Partial<CompleteRunFormData[typeof step]>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [step]: { ...prev[step], ...data },
    }));
  };

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
            onChange={(data) => updateStepData('run', data)}
            wells={wells}
          />
        );
      case 1:
        // Step 2: Location Form
        return (
          <LocationStep
            data={formData.location}
            onChange={(data) => updateStepData('location', data)}
            wellId={formData.run.well}
          />
        );
      case 2:
        // Step 3: Depth Form
        return (
          <DepthStep
            data={formData.depth}
            onChange={(data) => updateStepData('depth', data)}
            wellId={formData.run.well}
          />
        );
      case 3:
        // Step 4: Survey Type Form
        return (
          <SurveyStep
            data={formData.survey}
            onChange={(data) => updateStepData('survey', data)}
          />
        );
      case 4:
        // Step 5: Tie-On Form
        return (
          <TieOnStep
            data={formData.tieon}
            onChange={(data) => updateStepData('tieon', data)}
          />
        );
      case 5:
        // Step 6: Review & Submit
        return <ReviewStep data={formData} />;
      default:
        return null;
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
