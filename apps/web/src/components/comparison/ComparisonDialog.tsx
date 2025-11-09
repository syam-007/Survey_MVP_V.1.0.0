/**
 * ComparisonDialog Component
 *
 * Dialog for selecting/uploading surveys and creating a comparison.
 */
import React, { useState, useCallback } from 'react';
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
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  CompareArrows as CompareArrowsIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import type { Run } from '../../types/run.types';

interface ComparisonDialogProps {
  open: boolean;
  run: Run;
  onClose: () => void;
}

export const ComparisonDialog: React.FC<ComparisonDialogProps> = ({
  open,
  run,
  onClose,
}) => {
  const navigate = useNavigate();

  // State
  const [selectedPrimary, setSelectedPrimary] = useState<string>('');
  const [selectedReference, setSelectedReference] = useState<string>('');
  const [useUploadForReference, setUseUploadForReference] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [ratioFactor, setRatioFactor] = useState<number>(5);
  const [isUploading, setIsUploading] = useState(false);

  // Get completed surveys - all completed surveys can be used as primary or reference
  const completedSurveys = run?.survey_files?.filter(
    (file) => file.processing_status === 'completed' && file.survey_data_id
  ) || [];

  // Automatically determine survey type from survey_type
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

  const handleCompare = async () => {
    if (!selectedPrimary) return;

    // If using upload for reference, upload the file first
    if (useUploadForReference) {
      if (!referenceFile) return;

      setIsUploading(true);

      try {
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

        // Get survey_data_id from response
        const referenceSurveyId = referenceData.id || referenceData.survey_data?.id;

        // Navigate to comparison page with auto-trigger
        navigate(`/runs/${run.id}/comparison?primary=${selectedPrimary}&reference=${referenceSurveyId}&auto=true`);
        handleClose();
      } catch (error) {
        console.error('Upload reference survey failed:', error);
        alert('Failed to upload reference survey. Please try again.');
      } finally {
        setIsUploading(false);
      }
    } else {
      // Use selected reference survey
      if (!selectedReference) return;
      navigate(`/runs/${run.id}/comparison?primary=${selectedPrimary}&reference=${selectedReference}&auto=true`);
      handleClose();
    }
  };

  const handleClose = () => {
    if (isUploading) return;

    setSelectedPrimary('');
    setSelectedReference('');
    setUseUploadForReference(false);
    setReferenceFile(null);
    setRatioFactor(5);
    onClose();
  };

  const canCompare = selectedPrimary && (
    useUploadForReference ? referenceFile : (selectedReference && selectedPrimary !== selectedReference)
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Compare Surveys</Typography>
          <IconButton onClick={handleClose} disabled={isUploading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          <Alert severity="info">
            Select a primary survey from this run and choose a reference survey (either existing or upload new).
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

          <FormControl fullWidth disabled={isUploading || completedSurveys.length === 0}>
            <InputLabel>Comparative Survey</InputLabel>
            <Select
              value={selectedPrimary}
              onChange={(e) => setSelectedPrimary(e.target.value)}
              label="Primary Survey"
            >
              {completedSurveys.map((survey) => (
                <MenuItem
                  key={survey.survey_data_id}
                  value={survey.survey_data_id}
                >
                  {survey.filename} - {survey.survey_type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider>
            <Typography variant="caption" color="text.secondary">
              Reference Survey
            </Typography>
          </Divider>

          <Box>
            <Stack direction="row" spacing={2} mb={2}>
              <Button
                variant={!useUploadForReference ? 'contained' : 'outlined'}
                onClick={() => {
                  setUseUploadForReference(false);
                  setReferenceFile(null);
                }}
                disabled={isUploading}
                fullWidth
              >
                Select Existing
              </Button>
              {/* <Button
                variant={useUploadForReference ? 'contained' : 'outlined'}
                onClick={() => {
                  setUseUploadForReference(true);
                  setSelectedReference('');
                }}
                disabled={isUploading}
                fullWidth
              >
                Upload New
              </Button> */}
            </Stack>

            {!useUploadForReference ? (
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
                Uploading reference survey and processing...
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
          onClick={handleCompare}
          disabled={!canCompare || isUploading}
          startIcon={isUploading ? null : <CompareArrowsIcon />}
        >
          {isUploading ? 'Uploading...' : 'Compare'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
