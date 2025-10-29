/**
 * SurveyUploadDialog Component
 *
 * Dialog for uploading survey files to a run (non-GTL surveys).
 * For GTL surveys, use GTLQAUploadDialog instead.
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
  LinearProgress,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import type { Run } from '../../types/run.types';

interface SurveyUploadDialogProps {
  open: boolean;
  run: Run;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SurveyUploadDialog: React.FC<SurveyUploadDialogProps> = ({
  open,
  run,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
        return 'Type 1 - GTL'; // Default to GTL
    }
  };

  const surveyType = getSurveyType();
  const surveyRole = 'primary'; // Always use primary survey

  // File dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
      setUploadError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    disabled: isUploading,
  });

  const handleUpload = async () => {
    if (!uploadedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('run_id', run.id);
      formData.append('survey_type', surveyType);
      formData.append('survey_role', surveyRole);

      const response = await fetch('http://localhost:8000/api/v1/surveys/upload/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Upload failed:', response.status, errorData);

        // Format error message with details if available
        let errorMessage = errorData.error || `Upload failed with status ${response.status}`;
        if (errorData.details) {
          const detailsArray = Array.isArray(errorData.details) ? errorData.details : [errorData.details];
          errorMessage += '\n\n' + detailsArray.join('\n');
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Survey uploaded successfully:', data);

      // Reset form
      setUploadedFile(null);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Close dialog
      handleClose();

      // Navigate to survey results page
      const surveyDataId = data.id || data.survey_data?.id;
      if (surveyDataId) {
        navigate(`/runs/${run.id}/surveys/${surveyDataId}`);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadError(error.message || 'Failed to upload survey. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;

    setUploadedFile(null);
    setUploadError(null);
    onClose();
  };

  const canUpload = uploadedFile && !isUploading;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Upload Survey File</Typography>
          <IconButton onClick={handleClose} disabled={isUploading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          <Alert severity="info">
            Upload a survey file (CSV, XLS, or XLSX) with MD, INC, and AZI columns.
            <br />
            <Typography variant="caption" component="div" sx={{ mt: 1 }}>
              Survey Type: <strong>{surveyType}</strong> (auto-detected from run type)
            </Typography>
          </Alert>

          {uploadError && (
            <Alert severity="error" onClose={() => setUploadError(null)}>
              {uploadError}
            </Alert>
          )}

          <Paper
            {...getRootProps()}
            elevation={0}
            sx={{
              p: 3,
              border: 2,
              borderStyle: 'dashed',
              borderColor: isDragActive ? 'primary.main' : 'divider',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" gutterBottom>
              {uploadedFile ? uploadedFile.name : 'Drop survey file here or click to select'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported formats: CSV, XLS, XLSX
            </Typography>
          </Paper>

          {isUploading && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uploading and processing survey file...
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
          onClick={handleUpload}
          disabled={!canUpload}
          startIcon={isUploading ? null : <CloudUploadIcon />}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
