/**
 * ComparisonUploadDialog Component
 *
 * Dialog for initiating survey comparison with flexible file selection.
 * Users can select from existing surveys or upload new files for both:
 * - Comparison File (primary survey)
 * - Reference File (reference survey)
 */
import React, { useState } from 'react';
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
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  CompareArrows as CompareArrowsIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';

interface Survey {
  id: string;
  survey_data_id?: string;
  filename: string;
  survey_type: string;
  upload_date: string;
  processing_status: string;
}

interface ComparisonUploadDialogProps {
  open: boolean;
  runId: string;
  existingSurveys: Survey[];
  onClose: () => void;
  onUploadAndCompare: (files: File[], surveyTypes: string[], existingSurveyId?: string) => Promise<void>;
}

type FileSelectionMode = 'existing' | 'upload';

export const ComparisonUploadDialog: React.FC<ComparisonUploadDialogProps> = ({
  open,
  runId,
  existingSurveys,
  onClose,
  onUploadAndCompare,
}) => {
  const navigate = useNavigate();

  // Comparison File (Primary)
  const [comparisonMode, setComparisonMode] = useState<FileSelectionMode>('existing');
  const [selectedComparisonSurvey, setSelectedComparisonSurvey] = useState<string>('');
  const [comparisonFile, setComparisonFile] = useState<File | null>(null);
  const [comparisonSurveyType, setComparisonSurveyType] = useState<string>('');

  // Reference File
  const [referenceMode, setReferenceMode] = useState<FileSelectionMode>('existing');
  const [selectedReferenceSurvey, setSelectedReferenceSurvey] = useState<string>('');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceSurveyType, setReferenceSurveyType] = useState<string>('');

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropzone for comparison file
  const { getRootProps: getComparisonProps, getInputProps: getComparisonInputProps, isDragActive: isComparisonDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setComparisonFile(acceptedFiles[0]);
        setError(null);
      }
    },
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    disabled: isUploading || comparisonMode !== 'upload',
  });

  // Dropzone for reference file
  const { getRootProps: getReferenceProps, getInputProps: getReferenceInputProps, isDragActive: isReferenceDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setReferenceFile(acceptedFiles[0]);
        setError(null);
      }
    },
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    disabled: isUploading || referenceMode !== 'upload',
  });

  const handleReset = () => {
    setComparisonMode('existing');
    setSelectedComparisonSurvey('');
    setComparisonFile(null);
    setComparisonSurveyType('');
    setReferenceMode('existing');
    setSelectedReferenceSurvey('');
    setReferenceFile(null);
    setReferenceSurveyType('');
    setError(null);
    setIsUploading(false);
  };

  const handleClose = () => {
    if (isUploading) return;
    handleReset();
    onClose();
  };

  const handleProceed = async () => {
    setError(null);

    // Validate comparison file
    if (comparisonMode === 'existing' && !selectedComparisonSurvey) {
      setError('Please select a comparison survey');
      return;
    }
    if (comparisonMode === 'upload' && !comparisonFile) {
      setError('Please upload a comparison file');
      return;
    }
    if (comparisonMode === 'upload' && !comparisonSurveyType) {
      setError('Please select comparison survey type');
      return;
    }

    // Validate reference file
    if (referenceMode === 'existing' && !selectedReferenceSurvey) {
      setError('Please select a reference survey');
      return;
    }
    if (referenceMode === 'upload' && !referenceFile) {
      setError('Please upload a reference file');
      return;
    }
    if (referenceMode === 'upload' && !referenceSurveyType) {
      setError('Please select reference survey type');
      return;
    }

    // Validate not selecting the same survey
    if (comparisonMode === 'existing' && referenceMode === 'existing' &&
        selectedComparisonSurvey === selectedReferenceSurvey) {
      setError('Comparison and reference surveys must be different');
      return;
    }

    setIsUploading(true);

    try {
      // Determine what to upload based on modes
      const filesToUpload: File[] = [];
      const surveyTypes: string[] = [];
      let existingSurveyId: string | undefined;

      // Case 1: Both existing - no upload needed, just navigate to comparison with auto-trigger
      if (comparisonMode === 'existing' && referenceMode === 'existing') {
        navigate(`/runs/${runId}/comparison?primary=${selectedComparisonSurvey}&reference=${selectedReferenceSurvey}&auto=true`);
        handleClose();
        return;
      }

      // Case 2: Comparison existing, reference upload
      if (comparisonMode === 'existing' && referenceMode === 'upload') {
        filesToUpload.push(referenceFile!);
        surveyTypes.push(referenceSurveyType);

        // Upload reference file
        await onUploadAndCompare(filesToUpload, surveyTypes, undefined);

        // Navigate with both IDs - comparison is existing, reference will be the newly uploaded one
        // The newly uploaded file will be added to survey_files, we need to let the page load and auto-select
        navigate(`/runs/${runId}/comparison?primary=${selectedComparisonSurvey}&auto=refresh`);
        handleClose();
        return;
      }

      // Case 3: Comparison upload, reference existing
      if (comparisonMode === 'upload' && referenceMode === 'existing') {
        filesToUpload.push(comparisonFile!);
        surveyTypes.push(comparisonSurveyType);

        // Upload comparison file
        await onUploadAndCompare(filesToUpload, surveyTypes, undefined);

        // Navigate with reference ID - comparison will be newly uploaded
        navigate(`/runs/${runId}/comparison?reference=${selectedReferenceSurvey}&auto=refresh`);
        handleClose();
        return;
      }

      // Case 4: Both upload
      if (comparisonMode === 'upload' && referenceMode === 'upload') {
        filesToUpload.push(comparisonFile!);
        filesToUpload.push(referenceFile!);
        surveyTypes.push(comparisonSurveyType);
        surveyTypes.push(referenceSurveyType);

        // Upload both files
        await onUploadAndCompare(filesToUpload, surveyTypes, undefined);

        // Navigate to comparison page - both are newly uploaded
        navigate(`/runs/${runId}/comparison?auto=refresh`);
        handleClose();
        return;
      }

      // Fallback navigation
      navigate(`/runs/${runId}/comparison`);
      handleClose();

    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Validation for proceed button
  const isValid =
    (comparisonMode === 'existing' ? !!selectedComparisonSurvey : (!!comparisonFile && !!comparisonSurveyType)) &&
    (referenceMode === 'existing' ? !!selectedReferenceSurvey : (!!referenceFile && !!referenceSurveyType)) &&
    !(comparisonMode === 'existing' && referenceMode === 'existing' && selectedComparisonSurvey === selectedReferenceSurvey);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <CompareArrowsIcon color="primary" />
            <Typography variant="h6">Setup Survey Comparison</Typography>
          </Box>
          <IconButton onClick={handleClose} disabled={isUploading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity="info">
            Select surveys to compare by choosing existing uploaded surveys or uploading new files.
          </Alert>

          {/* Comparison File Section */}
          <Box>
            <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
              Comparison File (Primary Survey)
            </Typography>

            <FormControl fullWidth disabled={isUploading} sx={{ mb: 2 }}>
              <InputLabel>Select Source</InputLabel>
              <Select
                value={comparisonMode}
                onChange={(e) => {
                  setComparisonMode(e.target.value as FileSelectionMode);
                  setSelectedComparisonSurvey('');
                  setComparisonFile(null);
                  setComparisonSurveyType('');
                }}
                label="Select Source"
              >
                <MenuItem value="existing">
                  Select from existing surveys
                </MenuItem>
                <MenuItem value="upload">
                  <Box display="flex" alignItems="center" gap={1}>
                    <UploadIcon fontSize="small" />
                    Upload new file
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Comparison: Existing Survey Dropdown */}
            {comparisonMode === 'existing' && (
              <FormControl fullWidth disabled={isUploading}>
                <InputLabel>Select Comparison Survey</InputLabel>
                <Select
                  value={selectedComparisonSurvey}
                  onChange={(e) => setSelectedComparisonSurvey(e.target.value)}
                  label="Select Comparison Survey"
                >
                  <MenuItem value="">
                    <em>Select a survey</em>
                  </MenuItem>
                  {existingSurveys.map((survey) => (
                    <MenuItem key={survey.id} value={survey.survey_data_id || ''}>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">{survey.filename}</Typography>
                          <Chip label={survey.survey_type} size="small" color="primary" />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Uploaded: {new Date(survey.upload_date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Comparison: Upload File */}
            {comparisonMode === 'upload' && (
              <Stack spacing={2}>
                <Paper
                  {...getComparisonProps()}
                  elevation={0}
                  sx={{
                    p: 3,
                    border: 2,
                    borderStyle: 'dashed',
                    borderColor: isComparisonDragActive ? 'primary.main' : 'divider',
                    bgcolor: isComparisonDragActive ? 'action.hover' : 'background.paper',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <input {...getComparisonInputProps()} />
                  <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2">
                    {comparisonFile
                      ? comparisonFile.name
                      : isComparisonDragActive
                      ? 'Drop the comparison file here...'
                      : 'Drag & drop comparison file, or click to select'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Supported: CSV, XLS, XLSX
                  </Typography>
                </Paper>

                <FormControl fullWidth disabled={isUploading || !comparisonFile}>
                  <InputLabel>Comparison Survey Type</InputLabel>
                  <Select
                    value={comparisonSurveyType}
                    onChange={(e) => setComparisonSurveyType(e.target.value)}
                    label="Comparison Survey Type"
                  >
                    <MenuItem value="Type 1 - GTL">GTL (Gyro Tool Log)</MenuItem>
                    <MenuItem value="Type 2 - Gyro">Gyro</MenuItem>
                    <MenuItem value="Type 3 - MWD">MWD (Measurement While Drilling)</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            )}
          </Box>

          <Divider />

          {/* Reference File Section */}
          <Box>
            <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
              Reference File
            </Typography>

            <FormControl fullWidth disabled={isUploading} sx={{ mb: 2 }}>
              <InputLabel>Select Source</InputLabel>
              <Select
                value={referenceMode}
                onChange={(e) => {
                  setReferenceMode(e.target.value as FileSelectionMode);
                  setSelectedReferenceSurvey('');
                  setReferenceFile(null);
                  setReferenceSurveyType('');
                }}
                label="Select Source"
              >
                <MenuItem value="existing">
                  Select from existing surveys
                </MenuItem>
                <MenuItem value="upload">
                  <Box display="flex" alignItems="center" gap={1}>
                    <UploadIcon fontSize="small" />
                    Upload new file
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Reference: Existing Survey Dropdown */}
            {referenceMode === 'existing' && (
              <FormControl fullWidth disabled={isUploading}>
                <InputLabel>Select Reference Survey</InputLabel>
                <Select
                  value={selectedReferenceSurvey}
                  onChange={(e) => setSelectedReferenceSurvey(e.target.value)}
                  label="Select Reference Survey"
                >
                  <MenuItem value="">
                    <em>Select a survey</em>
                  </MenuItem>
                  {existingSurveys.map((survey) => (
                    <MenuItem key={survey.id} value={survey.survey_data_id || ''}>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">{survey.filename}</Typography>
                          <Chip label={survey.survey_type} size="small" color="secondary" />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Uploaded: {new Date(survey.upload_date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Reference: Upload File */}
            {referenceMode === 'upload' && (
              <Stack spacing={2}>
                <Paper
                  {...getReferenceProps()}
                  elevation={0}
                  sx={{
                    p: 3,
                    border: 2,
                    borderStyle: 'dashed',
                    borderColor: isReferenceDragActive ? 'secondary.main' : 'divider',
                    bgcolor: isReferenceDragActive ? 'action.hover' : 'background.paper',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <input {...getReferenceInputProps()} />
                  <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2">
                    {referenceFile
                      ? referenceFile.name
                      : isReferenceDragActive
                      ? 'Drop the reference file here...'
                      : 'Drag & drop reference file, or click to select'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Supported: CSV, XLS, XLSX
                  </Typography>
                </Paper>

                <FormControl fullWidth disabled={isUploading || !referenceFile}>
                  <InputLabel>Reference Survey Type</InputLabel>
                  <Select
                    value={referenceSurveyType}
                    onChange={(e) => setReferenceSurveyType(e.target.value)}
                    label="Reference Survey Type"
                  >
                    <MenuItem value="Type 1 - GTL">GTL (Gyro Tool Log)</MenuItem>
                    <MenuItem value="Type 2 - Gyro">Gyro</MenuItem>
                    <MenuItem value="Type 3 - MWD">MWD (Measurement While Drilling)</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            )}
          </Box>

          {error && (
            <Alert severity="error">
              {error}
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
          onClick={handleProceed}
          disabled={!isValid || isUploading}
          startIcon={isUploading ? null : <CompareArrowsIcon />}
        >
          {isUploading ? 'Processing...' : 'Proceed to Comparison'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
