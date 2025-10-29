/**
 * CreateAdjustmentDialog Component
 *
 * Dialog for creating a new adjustment/comparison with upload options.
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
  Paper,
  IconButton,
  Divider,
  TextField,
  LinearProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import type { Run } from '../../types/run.types';

interface CreateAdjustmentDialogProps {
  open: boolean;
  run: Run;
  onClose: () => void;
}

export const CreateAdjustmentDialog: React.FC<CreateAdjustmentDialogProps> = ({
  open,
  run,
  onClose,
}) => {
  const navigate = useNavigate();

  // State
  const [primaryMode, setPrimaryMode] = useState<'current' | 'select' | 'upload'>('current');
  const [selectedPrimary, setSelectedPrimary] = useState<string>('');
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);

  const [referenceMode, setReferenceMode] = useState<'select' | 'upload'>('select');
  const [selectedReference, setSelectedReference] = useState<string>('');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);

  const [ratioFactor, setRatioFactor] = useState<number>(5);
  const [isUploading, setIsUploading] = useState(false);

  // Get completed surveys
  const completedSurveys = run?.survey_files?.filter(
    (file) => file.processing_status === 'completed' && file.survey_data_id
  ) || [];

  // Get the most recent survey as "current"
  const currentSurvey = completedSurveys.length > 0 ? completedSurveys[completedSurveys.length - 1] : null;

  // Auto-detect survey type from survey_type
  const getSurveyType = () => {
    switch (run.survey_type) {
      case 'GTL':
        return 'Type 1 - GTL';
      case 'Gyro':
        return 'Type 2 - Gyro';
      case 'MWD':
        return 'Type 3 - MWD';
      default:
        return 'Type 1 - GTL';
    }
  };

  const surveyType = getSurveyType();

  // Primary file dropzone
  const onDropPrimary = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setPrimaryFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps: getPrimaryRootProps, getInputProps: getPrimaryInputProps, isDragActive: isPrimaryDragActive } = useDropzone({
    onDrop: onDropPrimary,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    disabled: isUploading,
  });

  // Reference file dropzone
  const onDropReference = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setReferenceFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps: getReferenceRootProps, getInputProps: getReferenceInputProps, isDragActive: isReferenceDragActive } = useDropzone({
    onDrop: onDropReference,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    disabled: isUploading,
  });

  const handleCreate = async () => {
    setIsUploading(true);

    try {
      let primarySurveyId = '';
      let referenceSurveyId = '';

      // Handle primary survey
      if (primaryMode === 'current' && currentSurvey) {
        primarySurveyId = currentSurvey.survey_data_id!;
      } else if (primaryMode === 'select') {
        if (!selectedPrimary) {
          alert('Please select a primary survey');
          setIsUploading(false);
          return;
        }
        primarySurveyId = selectedPrimary;
      } else if (primaryMode === 'upload') {
        if (!primaryFile) {
          alert('Please upload a primary survey file');
          setIsUploading(false);
          return;
        }
        // Upload primary survey
        const primaryFormData = new FormData();
        primaryFormData.append('file', primaryFile);
        primaryFormData.append('run_id', run.id);
        primaryFormData.append('survey_type', surveyType);
        primaryFormData.append('survey_role', 'primary');

        const primaryResponse = await fetch('http://localhost:8000/api/v1/surveys/upload/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: primaryFormData,
        });

        if (!primaryResponse.ok) throw new Error('Failed to upload primary survey');
        const primaryData = await primaryResponse.json();
        primarySurveyId = primaryData.id || primaryData.survey_data?.id;
      }

      // Handle reference survey
      if (referenceMode === 'select') {
        if (!selectedReference) {
          alert('Please select a reference survey');
          setIsUploading(false);
          return;
        }
        referenceSurveyId = selectedReference;
      } else if (referenceMode === 'upload') {
        if (!referenceFile) {
          alert('Please upload a reference survey file');
          setIsUploading(false);
          return;
        }
        // Upload reference survey
        const referenceFormData = new FormData();
        referenceFormData.append('file', referenceFile);
        referenceFormData.append('run_id', run.id);
        referenceFormData.append('survey_type', surveyType);
        referenceFormData.append('survey_role', 'primary');

        const referenceResponse = await fetch('http://localhost:8000/api/v1/surveys/upload/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: referenceFormData,
        });

        if (!referenceResponse.ok) throw new Error('Failed to upload reference survey');
        const referenceData = await referenceResponse.json();
        referenceSurveyId = referenceData.id || referenceData.survey_data?.id;
      }

      // Create comparison first
      const comparisonResponse = await fetch(`http://localhost:8000/api/v1/comparisons/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          run_id: run.id,
          primary_survey_id: primarySurveyId,
          reference_survey_id: referenceSurveyId,
          ratio_factor: ratioFactor,
        }),
      });

      if (!comparisonResponse.ok) throw new Error('Failed to create comparison');
      const comparisonData = await comparisonResponse.json();

      // Navigate to adjustment detail page with comparison ID
      navigate(`/runs/${run.id}/adjustment/${comparisonData.id}`);
      handleClose();
    } catch (error) {
      console.error('Create adjustment failed:', error);
      alert('Failed to create adjustment. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;

    setPrimaryMode('current');
    setSelectedPrimary('');
    setPrimaryFile(null);
    setReferenceMode('select');
    setSelectedReference('');
    setReferenceFile(null);
    setRatioFactor(5);
    onClose();
  };

  const canCreate =
    (primaryMode === 'current' && currentSurvey) ||
    (primaryMode === 'select' && selectedPrimary) ||
    (primaryMode === 'upload' && primaryFile);

  const canCreateFinal = canCreate && (
    (referenceMode === 'select' && selectedReference) ||
    (referenceMode === 'upload' && referenceFile)
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Create New Adjustment</Typography>
          <IconButton onClick={handleClose} disabled={isUploading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          <Alert severity="info">
            Select surveys for adjustment. Primary is the survey to adjust, Reference is used for comparison.
            <br />
            <Typography variant="caption" component="div" sx={{ mt: 1 }}>
              Survey Type: <strong>{surveyType}</strong> (auto-detected from run type)
            </Typography>
          </Alert>

          {completedSurveys.length === 0 ? (
            <Alert severity="warning">
              No completed surveys available. Please upload a survey first.
            </Alert>
          ) : null}

          {/* Primary Survey Selection */}
          <Box>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Primary Survey (to adjust)
            </Typography>
            <RadioGroup
              value={primaryMode}
              onChange={(e) => {
                setPrimaryMode(e.target.value as 'current' | 'select' | 'upload');
                setSelectedPrimary('');
                setPrimaryFile(null);
              }}
            >
              <FormControlLabel
                value="current"
                control={<Radio />}
                label={`Use Current Survey ${currentSurvey ? `(${currentSurvey.filename})` : '(None available)'}`}
                disabled={!currentSurvey || isUploading}
              />
              <FormControlLabel
                value="select"
                control={<Radio />}
                label="Select Existing Survey"
                disabled={completedSurveys.length === 0 || isUploading}
              />
              <FormControlLabel
                value="upload"
                control={<Radio />}
                label="Upload New Survey"
                disabled={isUploading}
              />
            </RadioGroup>

            {primaryMode === 'select' && (
              <FormControl fullWidth sx={{ mt: 2 }} disabled={isUploading}>
                <InputLabel>Select Primary Survey</InputLabel>
                <Select
                  value={selectedPrimary}
                  onChange={(e) => setSelectedPrimary(e.target.value)}
                  label="Select Primary Survey"
                >
                  {completedSurveys.map((survey) => (
                    <MenuItem key={survey.survey_data_id} value={survey.survey_data_id}>
                      {survey.filename} - {survey.survey_type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {primaryMode === 'upload' && (
              <Paper
                {...getPrimaryRootProps()}
                elevation={0}
                sx={{
                  mt: 2,
                  p: 3,
                  border: 2,
                  borderStyle: 'dashed',
                  borderColor: isPrimaryDragActive ? 'primary.main' : 'divider',
                  bgcolor: isPrimaryDragActive ? 'action.hover' : 'background.paper',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <input {...getPrimaryInputProps()} />
                <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  {primaryFile ? primaryFile.name : 'Drop primary survey file or click to select'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supported formats: CSV, XLS, XLSX
                </Typography>
              </Paper>
            )}
          </Box>

          <Divider />

          {/* Reference Survey Selection */}
          <Box>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Reference Survey
            </Typography>
            <Stack direction="row" spacing={2} mb={2}>
              <Button
                variant={referenceMode === 'select' ? 'contained' : 'outlined'}
                onClick={() => {
                  setReferenceMode('select');
                  setReferenceFile(null);
                }}
                disabled={isUploading}
                fullWidth
              >
                Select Existing
              </Button>
              <Button
                variant={referenceMode === 'upload' ? 'contained' : 'outlined'}
                onClick={() => {
                  setReferenceMode('upload');
                  setSelectedReference('');
                }}
                disabled={isUploading}
                fullWidth
              >
                Upload New
              </Button>
            </Stack>

            {referenceMode === 'select' ? (
              <FormControl fullWidth disabled={isUploading || completedSurveys.length === 0}>
                <InputLabel>Reference Survey</InputLabel>
                <Select
                  value={selectedReference}
                  onChange={(e) => setSelectedReference(e.target.value)}
                  label="Reference Survey"
                >
                  {completedSurveys.map((survey) => (
                    <MenuItem
                      key={survey.survey_data_id}
                      value={survey.survey_data_id}
                      disabled={survey.survey_data_id === selectedPrimary}
                    >
                      {survey.filename} - {survey.survey_type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Paper
                {...getReferenceRootProps()}
                elevation={0}
                sx={{
                  p: 3,
                  border: 2,
                  borderStyle: 'dashed',
                  borderColor: isReferenceDragActive ? 'primary.main' : 'divider',
                  bgcolor: isReferenceDragActive ? 'action.hover' : 'background.paper',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <input {...getReferenceInputProps()} />
                <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  {referenceFile ? referenceFile.name : 'Drop reference survey file or click to select'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supported formats: CSV, XLS, XLSX
                </Typography>
              </Paper>
            )}
          </Box>

          <FormControl fullWidth disabled={isUploading}>
            <TextField
              label="Ratio Factor"
              type="number"
              value={ratioFactor}
              onChange={(e) => setRatioFactor(Number(e.target.value))}
              inputProps={{ min: 1, max: 20, step: 1 }}
              helperText="Delta analysis ratio factor (1-20)"
            />
          </FormControl>

          {isUploading && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uploading surveys and processing...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!canCreateFinal || isUploading}
          startIcon={isUploading ? null : <TuneIcon />}
        >
          {isUploading ? 'Creating...' : 'Create Adjustment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
