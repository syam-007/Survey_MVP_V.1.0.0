/**
 * ReferenceUploadDialog Component
 *
 * Dialog for uploading reference survey files.
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
  LinearProgress,
  Stack,
  Paper,
  IconButton,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useUploadReferenceSurvey } from '../../hooks/useComparison';

interface ReferenceUploadDialogProps {
  open: boolean;
  runId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReferenceUploadDialog: React.FC<ReferenceUploadDialogProps> = ({
  open,
  runId,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [surveyType, setSurveyType] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const { uploadReference, isUploading, error, reset } = useUploadReferenceSurvey();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setUploadSuccess(false);
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
    if (!selectedFile || !surveyType) return;

    try {
      await uploadReference({
        file: selectedFile,
        runId,
        surveyType,
      });

      setUploadSuccess(true);
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleClose = () => {
    if (isUploading) return;

    setSelectedFile(null);
    setSurveyType('');
    setUploadSuccess(false);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Upload Reference Survey</Typography>
          <IconButton onClick={handleClose} disabled={isUploading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          <Alert severity="info">
            Upload a reference survey file to compare against your primary survey. The reference
            survey will be processed and made available for comparison analysis.
          </Alert>

          {/* File Dropzone */}
          <Paper
            {...getRootProps()}
            elevation={0}
            sx={{
              p: 4,
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
              {selectedFile
                ? selectedFile.name
                : isDragActive
                ? 'Drop the file here...'
                : 'Drag & drop a survey file here, or click to select'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported formats: CSV, XLS, XLSX
            </Typography>
          </Paper>

          {/* Survey Type Selector */}
          <FormControl fullWidth disabled={isUploading || !selectedFile}>
            <InputLabel>Survey Type</InputLabel>
            <Select
              value={surveyType}
              onChange={(e) => setSurveyType(e.target.value)}
              label="Survey Type"
            >
              <MenuItem value="GTL">GTL (Gyro Tool Log)</MenuItem>
              <MenuItem value="Gyro">Gyro</MenuItem>
              <MenuItem value="MWD">MWD (Measurement While Drilling)</MenuItem>
            </Select>
          </FormControl>

          {/* Upload Progress */}
          {isUploading && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uploading reference survey...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Success Message */}
          {uploadSuccess && (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              Reference survey uploaded successfully! Processing in background.
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert severity="error">
              {error.message || 'Upload failed. Please try again.'}
            </Alert>
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
          disabled={!selectedFile || !surveyType || isUploading || uploadSuccess}
          startIcon={isUploading ? null : <CloudUploadIcon />}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
