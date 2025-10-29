/**
 * GTL QA Upload Dialog Component
 *
 * Separate dialog for uploading GTL survey files for QA review.
 * After upload, navigates to Survey Results page where user can review QA,
 * delete stations, and approve the survey.
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
import qaService from '../../services/qaService';

interface GTLQAUploadDialogProps {
  open: boolean;
  run: Run;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GTLQAUploadDialog: React.FC<GTLQAUploadDialogProps> = ({
  open,
  run,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
      const qaResult: any = await qaService.uploadGTLForQA(uploadedFile, run.id, 'Type 1 - GTL');
      console.log('GTL QA data received:', qaResult);

      // Close dialog
      handleClose();

      // Navigate to Survey Results page where user can review QA
      const surveyDataId = qaResult.survey_data_id;
      if (surveyDataId) {
        navigate(`/runs/${run.id}/surveys/${surveyDataId}`);
      }

      // Call success callback to refetch run data
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('QA Upload failed:', error);
      setUploadError(error.response?.data?.error || error.message || 'Failed to upload file for QA. Please try again.');
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
            <Typography variant="h6">Upload GTL Survey for QA</Typography>
            <IconButton onClick={handleClose} disabled={isUploading}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3}>
            <Alert severity="info">
              Upload a GTL survey file (CSV, XLS, or XLSX) with <strong>MD, INC, AZI, G(T), and W(T)</strong> columns.
              <br />
              <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                The system will perform quality assurance checks comparing your G(T) and W(T) values
                with the calculated location values.
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
                {uploadedFile ? uploadedFile.name : 'Drop GTL survey file here or click to select'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supported formats: CSV, XLS, XLSX
              </Typography>
            </Paper>

            {isUploading && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Uploading and performing QA analysis...
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
            {isUploading ? 'Analyzing...' : 'Upload for QA'}
          </Button>
        </DialogActions>
      </Dialog>
  );
};
