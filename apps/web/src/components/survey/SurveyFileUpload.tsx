/**
 * SurveyFileUpload Component
 *
 * Provides drag-and-drop file upload functionality for survey data files.
 * Supports .xlsx and .csv formats with file size validation (max 50MB).
 * Shows upload progress and handles validation errors.
 */
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useSurveyUpload } from '../../hooks/useSurveyUpload';

interface SurveyFileUploadProps {
  runId: string;
  onUploadComplete: (surveyDataId: string) => void;
  onUploadError: (error: string) => void;
}

export const SurveyFileUpload: React.FC<SurveyFileUploadProps> = ({
  runId,
  onUploadComplete,
  onUploadError
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [surveyType, setSurveyType] = useState<string>('Type 2 - Gyro');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const { uploadSurvey, isUploading, error } = useSurveyUpload();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxSize: 50 * 1024 * 1024,  // 50MB
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const result = await uploadSurvey({
        file: selectedFile,
        runId,
        surveyType,
        onProgress: (progress) => setUploadProgress(progress)
      });

      onUploadComplete(result.surveyDataId);
    } catch (err: any) {
      onUploadError(err.message || 'Upload failed');
    }
  };

  const handleSurveyTypeChange = (event: SelectChangeEvent<string>) => {
    setSurveyType(event.target.value);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto', mt: 4 }}>
      {/* Survey Type Selector */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Survey Type</InputLabel>
        <Select
          value={surveyType}
          onChange={handleSurveyTypeChange}
          disabled={isUploading}
          label="Survey Type"
        >
          <MenuItem value="Type 1 - GTL">Type 1 - GTL</MenuItem>
          <MenuItem value="Type 2 - Gyro">Type 2 - Gyro</MenuItem>
          <MenuItem value="Type 3 - MWD">Type 3 - MWD</MenuItem>
          <MenuItem value="Type 4 - Unknown">Type 4 - Unknown</MenuItem>
        </Select>
      </FormControl>

      {/* Dropzone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.400',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.3s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover'
          }
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        {isDragActive ? (
          <Typography>Drop the file here...</Typography>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>
              Drag & drop survey file here
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to select file
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Supported formats: .xlsx, .csv (max 50MB)
            </Typography>
          </>
        )}
      </Paper>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {fileRejections[0].errors[0].message}
        </Alert>
      )}

      {/* Selected File Info */}
      {selectedFile && !isUploading && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="subtitle2">Selected File:</Typography>
          <Typography variant="body2">
            {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </Typography>
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            onClick={handleUpload}
          >
            Upload and Process
          </Button>
        </Box>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Uploading... {uploadProgress}%
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};
