/**
 * JobDuplicateSurveyDialog Component
 *
 * Dialog for duplicate survey calculation from job page - select survey from any run in the job.
 */
import React, { useState, useCallback, useMemo } from 'react';
import config from '../../config/env';
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
  LinearProgress,
  Chip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import type { Run } from '../../types/run.types';

interface JobDuplicateSurveyDialogProps {
  open: boolean;
  runs: Run[];
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
      id={`duplicate-survey-tabpanel-${index}`}
      aria-labelledby={`duplicate-survey-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface SurveyOption {
  surveyDataId: string;
  runId: string;
  runNumber: string;
  runName: string;
  fileName: string;
  surveyType: string;
}

export const JobDuplicateSurveyDialog: React.FC<JobDuplicateSurveyDialogProps> = ({
  open,
  runs,
  onClose,
}) => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  // Select existing survey tab state
  const [selectedSurvey, setSelectedSurvey] = useState<string>('');

  // Upload new file tab state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [surveyType, setSurveyType] = useState<string>('');
  const [selectedRunForUpload, setSelectedRunForUpload] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Get all completed surveys from all runs in the job
  const allSurveys = useMemo(() => {
    const surveys: SurveyOption[] = [];
    runs.forEach((run) => {
      const completedSurveys = run.survey_files?.filter(
        (file) => file.processing_status === 'completed' && file.survey_data_id
      ) || [];

      completedSurveys.forEach((survey) => {
        surveys.push({
          surveyDataId: survey.survey_data_id!,
          runId: run.id,
          runNumber: run.run_number,
          runName: run.run_name,
          fileName: survey.filename,
          surveyType: survey.survey_type,
        });
      });
    });
    return surveys;
  }, [runs]);

  // File dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
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

  const handleCalculateExisting = () => {
    if (!selectedSurvey) return;

    // Find the run associated with this survey
    const survey = allSurveys.find(s => s.surveyDataId === selectedSurvey);
    if (!survey) return;

    // Navigate to duplicate survey page
    navigate(`/runs/${survey.runId}/duplicate-survey/new?surveyId=${selectedSurvey}`);
    handleClose();
  };

  const handleUploadAndCalculate = async () => {
    if (!uploadedFile || !surveyType || !selectedRunForUpload) return;

    setIsUploading(true);

    try {
      // Upload survey
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('run_id', selectedRunForUpload);
      formData.append('survey_type', surveyType);
      formData.append('survey_role', 'primary');

      const response = await fetch(`${config.apiBaseUrl}/api/v1/surveys/upload/`, {
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

      // Navigate to duplicate survey page with surveyId
      const surveyDataId = data.id || data.survey_data?.id;
      if (surveyDataId) {
        navigate(`/runs/${selectedRunForUpload}/duplicate-survey/new?surveyId=${surveyDataId}`);
        handleClose();
      } else {
        console.error('Upload response:', data);
        throw new Error('Survey data ID not returned from upload');
      }
    } catch (error: any) {
      console.error('Upload and calculate failed:', error);
      alert(`Failed to upload survey: ${error.message || 'Please try again.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;

    setTabValue(0);
    setSelectedSurvey('');
    setUploadedFile(null);
    setSurveyType('');
    setSelectedRunForUpload('');
    onClose();
  };

  const canCalculateExisting = selectedSurvey;
  const canUploadAndCalculate = uploadedFile && surveyType && selectedRunForUpload;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Duplicate Survey Calculation</Typography>
          <IconButton onClick={handleClose} disabled={isUploading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          <Alert severity="info">
            Calculate forward (MD/INC/AZI → positions) and inverse (positions → INC/AZI) to compare results.
          </Alert>

          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Select Existing Survey" />
            <Tab label="Upload New File" />
          </Tabs>

          {/* Tab 1: Select Existing Survey */}
          <TabPanel value={tabValue} index={0}>
            <Stack spacing={3}>
              {allSurveys.length === 0 ? (
                <Alert severity="warning">
                  No surveys available. Please upload a survey first or use the "Upload New File" tab.
                </Alert>
              ) : null}

              <FormControl fullWidth disabled={isUploading || allSurveys.length === 0}>
                <InputLabel>Select Survey</InputLabel>
                <Select
                  value={selectedSurvey}
                  onChange={(e: SelectChangeEvent) => setSelectedSurvey(e.target.value)}
                  label="Select Survey"
                >
                  {allSurveys.map((survey) => (
                    <MenuItem key={survey.surveyDataId} value={survey.surveyDataId}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {survey.fileName}
                        </Typography>
                        <Chip
                          label={survey.runNumber}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                        <Chip
                          label={survey.surveyType}
                          size="small"
                          color="primary"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </TabPanel>

          {/* Tab 2: Upload New File */}
          <TabPanel value={tabValue} index={1}>
            <Stack spacing={3}>
              {/* Run Selection */}
              <FormControl fullWidth disabled={isUploading}>
                <InputLabel>Select Run</InputLabel>
                <Select
                  value={selectedRunForUpload}
                  onChange={(e: SelectChangeEvent) => setSelectedRunForUpload(e.target.value)}
                  label="Select Run"
                  size="small"
                >
                  {runs.map((run) => (
                    <MenuItem key={run.id} value={run.id}>
                      {run.run_number} - {run.run_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

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
                <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2">
                  {uploadedFile ? uploadedFile.name : 'Drop survey file or click to select'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  CSV, XLS, XLSX (MD, INC, AZI columns required)
                </Typography>
              </Paper>

              <FormControl fullWidth disabled={isUploading || !uploadedFile}>
                <InputLabel>Survey Type</InputLabel>
                <Select
                  value={surveyType}
                  onChange={(e: SelectChangeEvent) => setSurveyType(e.target.value)}
                  label="Survey Type"
                  size="small"
                >
                  <MenuItem value="Type 1 - GTL">GTL (Gyro Tool Log)</MenuItem>
                  <MenuItem value="Type 2 - Gyro">Gyro</MenuItem>
                  <MenuItem value="Type 3 - MWD">MWD (Measurement While Drilling)</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </TabPanel>

          {isUploading && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uploading survey and processing...
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
            onClick={handleCalculateExisting}
            disabled={!canCalculateExisting || isUploading}
            startIcon={<CalculateIcon />}
          >
            Calculate
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleUploadAndCalculate}
            disabled={!canUploadAndCalculate || isUploading}
            startIcon={isUploading ? null : <CloudUploadIcon />}
          >
            {isUploading ? 'Uploading...' : 'Upload & Calculate'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
