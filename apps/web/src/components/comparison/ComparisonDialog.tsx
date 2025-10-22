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
  Tabs,
  Tab,
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`comparison-tabpanel-${index}`}
      aria-labelledby={`comparison-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const ComparisonDialog: React.FC<ComparisonDialogProps> = ({
  open,
  run,
  onClose,
}) => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  // Select existing files tab state
  const [selectedPrimary, setSelectedPrimary] = useState<string>('');
  const [selectedReference, setSelectedReference] = useState<string>('');
  const [ratioFactor, setRatioFactor] = useState<number>(5);

  // Upload new files tab state
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [primaryType, setPrimaryType] = useState<string>('');
  const [referenceType, setReferenceType] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Get completed surveys
  const completedSurveys = run?.survey_files?.filter(
    (file) => file.processing_status === 'completed' && file.survey_data_id
  ) || [];

  const primarySurveys = completedSurveys.filter((file) => file.survey_role === 'primary');
  const referenceSurveys = completedSurveys.filter((file) => file.survey_role === 'reference');

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

  const handleCompareExisting = () => {
    if (!selectedPrimary || !selectedReference) return;

    // Navigate to comparison page with auto-trigger
    navigate(`/runs/${run.id}/comparison?primary=${selectedPrimary}&reference=${selectedReference}&auto=true`);
    handleClose();
  };

  const handleUploadAndCompare = async () => {
    if (!primaryFile || !referenceFile || !primaryType || !referenceType) return;

    setIsUploading(true);

    try {
      // Upload primary survey
      const primaryFormData = new FormData();
      primaryFormData.append('file', primaryFile);
      primaryFormData.append('run_id', run.id);
      primaryFormData.append('survey_type', primaryType);
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

      // Upload reference survey
      const referenceFormData = new FormData();
      referenceFormData.append('file', referenceFile);
      referenceFormData.append('run_id', run.id);
      referenceFormData.append('survey_type', referenceType);
      referenceFormData.append('survey_role', 'reference');

      const referenceResponse = await fetch('http://localhost:8000/api/v1/surveys/upload/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: referenceFormData,
      });

      if (!referenceResponse.ok) throw new Error('Failed to upload reference survey');
      const referenceData = await referenceResponse.json();

      // Navigate to comparison page with auto-trigger
      navigate(`/runs/${run.id}/comparison?primary=${primaryData.survey_data_id}&reference=${referenceData.survey_data_id}&auto=true`);
      handleClose();
    } catch (error) {
      console.error('Upload and compare failed:', error);
      alert('Failed to upload surveys. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;

    setTabValue(0);
    setSelectedPrimary('');
    setSelectedReference('');
    setRatioFactor(5);
    setPrimaryFile(null);
    setReferenceFile(null);
    setPrimaryType('');
    setReferenceType('');
    onClose();
  };

  const canCompareExisting = selectedPrimary && selectedReference;
  const canUploadAndCompare = primaryFile && referenceFile && primaryType && referenceType;

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
            Select two existing surveys or upload new files to compare.
          </Alert>

          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Select Existing Files" />
            <Tab label="Upload New Files" />
          </Tabs>

          {/* Tab 1: Select Existing Files */}
          <TabPanel value={tabValue} index={0}>
            <Stack spacing={3}>
              {primarySurveys.length === 0 || referenceSurveys.length === 0 ? (
                <Alert severity="warning">
                  {primarySurveys.length === 0 && 'No primary surveys available. '}
                  {referenceSurveys.length === 0 && 'No reference surveys available. '}
                  Please upload surveys first or use the "Upload New Files" tab.
                </Alert>
              ) : null}

              <FormControl fullWidth disabled={isUploading || primarySurveys.length === 0}>
                <InputLabel>Primary Survey</InputLabel>
                <Select
                  value={selectedPrimary}
                  onChange={(e) => setSelectedPrimary(e.target.value)}
                  label="Primary Survey"
                >
                  {primarySurveys.map((survey) => (
                    <MenuItem key={survey.survey_data_id} value={survey.survey_data_id}>
                      {survey.file_name} - {survey.survey_type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={isUploading || referenceSurveys.length === 0}>
                <InputLabel>Reference Survey</InputLabel>
                <Select
                  value={selectedReference}
                  onChange={(e) => setSelectedReference(e.target.value)}
                  label="Reference Survey"
                >
                  {referenceSurveys.map((survey) => (
                    <MenuItem key={survey.survey_data_id} value={survey.survey_data_id}>
                      {survey.file_name} - {survey.survey_type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

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
            </Stack>
          </TabPanel>

          {/* Tab 2: Upload New Files */}
          <TabPanel value={tabValue} index={1}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                  Primary Survey
                </Typography>
                <Paper
                  {...getPrimaryRootProps()}
                  elevation={0}
                  sx={{
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
                  <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2">
                    {primaryFile ? primaryFile.name : 'Drop primary survey file or click to select'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    CSV, XLS, XLSX
                  </Typography>
                </Paper>
                <FormControl fullWidth sx={{ mt: 1 }} disabled={isUploading || !primaryFile}>
                  <InputLabel>Survey Type</InputLabel>
                  <Select
                    value={primaryType}
                    onChange={(e) => setPrimaryType(e.target.value)}
                    label="Survey Type"
                    size="small"
                  >
                    <MenuItem value="GTL">GTL (Gyro Tool Log)</MenuItem>
                    <MenuItem value="Gyro">Gyro</MenuItem>
                    <MenuItem value="MWD">MWD (Measurement While Drilling)</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                  Reference Survey
                </Typography>
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
                  <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2">
                    {referenceFile ? referenceFile.name : 'Drop reference survey file or click to select'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    CSV, XLS, XLSX
                  </Typography>
                </Paper>
                <FormControl fullWidth sx={{ mt: 1 }} disabled={isUploading || !referenceFile}>
                  <InputLabel>Survey Type</InputLabel>
                  <Select
                    value={referenceType}
                    onChange={(e) => setReferenceType(e.target.value)}
                    label="Survey Type"
                    size="small"
                  >
                    <MenuItem value="GTL">GTL (Gyro Tool Log)</MenuItem>
                    <MenuItem value="Gyro">Gyro</MenuItem>
                    <MenuItem value="MWD">MWD (Measurement While Drilling)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Stack>
          </TabPanel>

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
        {tabValue === 0 ? (
          <Button
            variant="contained"
            onClick={handleCompareExisting}
            disabled={!canCompareExisting || isUploading}
            startIcon={<CompareArrowsIcon />}
          >
            Compare
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleUploadAndCompare}
            disabled={!canUploadAndCompare || isUploading}
            startIcon={isUploading ? null : <CloudUploadIcon />}
          >
            {isUploading ? 'Uploading...' : 'Upload & Compare'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
