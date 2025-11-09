import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Container,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CompareArrows as CompareIcon,
} from '@mui/icons-material';
import Plot from 'react-plotly.js';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { useGetJobByIdQuery, useGetJobRunsQuery } from '../../stores/jobsSlice';

interface SurveyFile {
  id: string;
  filename: string;
  file_type: string;
  uploaded_at: string;
}

interface ComparisonResult {
  depth: number;
  inclination1: number;
  azimuth1: number;
  inclination2: number;
  azimuth2: number;
  inc_diff: number;
  azi_diff: number;
  delta_horizontal: number;
  delta_vertical: number;
  comparison_north: number;
  comparison_east: number;
  comparison_tvd: number;
  reference_north: number;
  reference_east: number;
  reference_tvd: number;
  delta_north: number;
  delta_east: number;
  delta_tvd: number;
  displacement: number;
}

interface ComparisonData {
  results: ComparisonResult[];
  comparison_easting: number[];
  comparison_northing: number[];
  comparison_tvd: number[];
  reference_easting: number[];
  reference_northing: number[];
  reference_tvd: number[];
  file1_name: string;
  file2_name: string;
}

/**
 * JobComparisonPage Component
 * Allows users to compare survey files from different runs within a job
 */
export const JobComparisonPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Fetch job and runs
  const { data: job, isLoading: loadingJob, error: jobError } = useGetJobByIdQuery(jobId!);
  const { data: runs, isLoading: loadingRuns } = useGetJobRunsQuery(jobId!);

  // Selection states
  const [selectedRun1, setSelectedRun1] = useState<string>('');
  const [selectedRun2, setSelectedRun2] = useState<string>('');
  const [selectedFile1, setSelectedFile1] = useState<string>('');
  const [selectedFile2, setSelectedFile2] = useState<string>('');
  const [resolution, setResolution] = useState<number | string>(5);

  // Files and comparison data
  const [filesRun1, setFilesRun1] = useState<SurveyFile[]>([]);
  const [filesRun2, setFilesRun2] = useState<SurveyFile[]>([]);
  const [loadingFiles1, setLoadingFiles1] = useState(false);
  const [loadingFiles2, setLoadingFiles2] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Fetch files when run is selected
  const fetchRunFiles = async (runId: string, setFiles: React.Dispatch<React.SetStateAction<SurveyFile[]>>, setLoading: React.Dispatch<React.SetStateAction<boolean>>) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/runs/${runId}/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      const data = await response.json();
      setFiles(data.survey_files || []);
    } catch (err) {
      console.error('Error fetching run files:', err);
      setError('Failed to fetch survey files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRun1) {
      fetchRunFiles(selectedRun1, setFilesRun1, setLoadingFiles1);
      setSelectedFile1('');
    } else {
      setFilesRun1([]);
      setSelectedFile1('');
    }
  }, [selectedRun1]);

  useEffect(() => {
    if (selectedRun2) {
      fetchRunFiles(selectedRun2, setFilesRun2, setLoadingFiles2);
      setSelectedFile2('');
    } else {
      setFilesRun2([]);
      setSelectedFile2('');
    }
  }, [selectedRun2]);

  // Perform comparison
  const handleCompare = async () => {
    if (!selectedFile1 || !selectedFile2) {
      setError('Please select files from both runs');
      return;
    }

    // Convert resolution to number and validate
    const resolutionNum = Number(resolution);
    if (!resolution || isNaN(resolutionNum) || resolutionNum < 1 || resolutionNum > 100) {
      setError('Resolution must be between 1 and 100');
      setResolution(5); // Reset to default
      return;
    }

    setComparing(true);
    setError(null);

    try {
      // Call comparison API endpoint
      const response = await fetch('http://localhost:8000/api/v1/comparisons/compare/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          file1_id: selectedFile1,
          file2_id: selectedFile2,
          resolution: resolutionNum,
        }),
      });

      if (!response.ok) {
        // Try to parse error response
        const errorData = await response.json().catch(() => null);
        if (errorData) {
          // If we have structured error data, use it
          const errorMsg = errorData.message || errorData.error || 'Comparison failed';
          const details = errorData.details ? `\n\nDetails: ${errorData.details}` : '';
          const suggestion = errorData.suggestion ? `\n\n${errorData.suggestion}` : '';
          throw new Error(`${errorMsg}${details}${suggestion}`);
        }
        throw new Error('Comparison failed');
      }

      const data = await response.json();
      setComparisonData(data as ComparisonData);
    } catch (err: any) {
      console.error('Comparison error:', err);
      setError(err.message || 'Failed to perform comparison');
    } finally {
      setComparing(false);
    }
  };

  // Loading state
  if (loadingJob) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Error state
  if (jobError || !job) {
    return (
      <Container maxWidth="xl">
        <ErrorAlert
          message="Failed to load job details. Please try again."
          onRetry={() => window.location.reload()}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <PageHeader
        title={`Comparison - Job ${job.job_number}`}
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Jobs', path: '/jobs' },
          { label: job.job_number, path: `/jobs/${jobId}` },
          { label: 'Comparison' },
        ]}
      />

      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/jobs/${jobId}`)}
        sx={{ mb: 3 }}
      >
        Back to Job
      </Button>

      <Grid container spacing={3}>
        {/* Selection Panel */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Select Runs and Files to Compare
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* Run 1 Selection */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom color="primary">
                  Comparative survey
                  </Typography>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Select Run 1</InputLabel>
                    <Select
                      value={selectedRun1}
                      label="Select Run 1"
                      onChange={(e) => setSelectedRun1(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {runs?.map((run: any) => (
                        <MenuItem key={run.id} value={run.id}>
                          {run.run_number} - {run.run_name} ({run.survey_type})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth disabled={!selectedRun1 || loadingFiles1}>
                    <InputLabel>Select Survey File</InputLabel>
                    <Select
                      value={selectedFile1}
                      label="Select Survey File"
                      onChange={(e) => setSelectedFile1(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {filesRun1.map((file) => (
                        <MenuItem key={file.id} value={file.id}>
                          {file.filename} ({file.file_type})
                        </MenuItem>
                      ))}
                    </Select>
                    {loadingFiles1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                        <CircularProgress size={20} />
                      </Box>
                    )}
                  </FormControl>
                </Paper>
              </Grid>

              {/* Run 2 Selection */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom color="secondary">
                    Reference Survey
                  </Typography>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Select Run 2</InputLabel>
                    <Select
                      value={selectedRun2}
                      label="Select Run 2"
                      onChange={(e) => setSelectedRun2(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {runs?.map((run: any) => (
                        <MenuItem key={run.id} value={run.id}>
                          {run.run_number} - {run.run_name} ({run.survey_type})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth disabled={!selectedRun2 || loadingFiles2}>
                    <InputLabel>Select Survey File</InputLabel>
                    <Select
                      value={selectedFile2}
                      label="Select Survey File"
                      onChange={(e) => setSelectedFile2(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {filesRun2.map((file) => (
                        <MenuItem key={file.id} value={file.id}>
                          {file.filename} ({file.file_type})
                        </MenuItem>
                      ))}
                    </Select>
                    {loadingFiles2 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                        <CircularProgress size={20} />
                      </Box>
                    )}
                  </FormControl>
                </Paper>
              </Grid>

              {/* Resolution Control */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    Interpolation Resolution (meters)
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Resolution"
                        type="number"
                        value={resolution}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            // Allow empty temporarily while typing
                            setResolution('' as any);
                          } else {
                            const numVal = Number(val);
                            if (numVal >= 0) {
                              setResolution(numVal);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // Validate on blur - ensure minimum value
                          const val = e.target.value;
                          if (val === '' || Number(val) < 1) {
                            setResolution(1);
                          }
                        }}
                        inputProps={{
                          min: 1,
                          max: 100,
                          step: 1,
                        }}
                        helperText="Range: 1 to 100 meters (Default: 5m)"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Compare Button */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<CompareIcon />}
                    onClick={handleCompare}
                    disabled={!selectedFile1 || !selectedFile2 || comparing}
                  >
                    {comparing ? 'Comparing...' : 'Compare'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Comparison Results */}
        {comparisonData && comparisonData.results && comparisonData.results.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Comparison Results
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
                <Tab label="Data Table" />
                <Tab label="Statistical Summary" />
                <Tab label="3D Plot" />
                <Tab label="Inclination Comparison" />
                <Tab label="Azimuth Comparison" />
                <Tab label="Inclination Difference" />
                <Tab label="Azimuth Difference" />
                <Tab label="Horizontal/Vertical Delta" />
              </Tabs>

              {/* Tab 0: Data Table */}
              {activeTab === 0 && (
                <Box>
                  {/* Color Legend */}
                  <Box sx={{ mb: 2, p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom fontWeight="600">
                     Indicators:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 16, height: 16, backgroundColor: '#4caf50', borderRadius: 0.5 }} />
                        <Typography variant="body2">Good (Small difference)</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 16, height: 16, backgroundColor: '#ff9800', borderRadius: 0.5 }} />
                        <Typography variant="body2">Warning (Moderate difference)</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 16, height: 16, backgroundColor: '#f44336', borderRadius: 0.5 }} />
                        <Typography variant="body2">Error (Large difference)</Typography>
                      </Box>
                    </Box>
                  </Box>

                  <TableContainer
                    sx={{
                      maxHeight: 600,
                      overflow: 'auto',
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                    }}
                  >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Depth (MD)</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>INC_ref</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>AZI_ref</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>North Ref</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>East Ref</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>TVD Ref</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>INC_comp</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>AZI_Comp</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>North Comp</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>East Comp</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>TVD Comp</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>Inc Diff</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>Azi Diff</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#fff3e0', fontWeight: 'bold' }}>Delta N</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#fff3e0', fontWeight: 'bold' }}>Delta E</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#fff3e0', fontWeight: 'bold' }}>Delta TVD</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#ffe0b2', fontWeight: 'bold' }}>Displacement</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {comparisonData.results.map((result, index) => {
                        // Helper function to get color based on delta magnitude
                        const getDeltaColor = (value: number, threshold1: number = 0.5, threshold2: number = 1.0) => {
                          const absValue = Math.abs(value);
                          if (absValue < threshold1) return '#4caf50'; // Green - good
                          if (absValue < threshold2) return '#ff9800'; // Orange - warning
                          return '#f44336'; // Red - error
                        };

                        return (
                          <TableRow key={index} hover>
                            <TableCell>{result.depth.toFixed(2)}</TableCell>
                            <TableCell align="right">{result.inclination1.toFixed(4)}</TableCell>
                            <TableCell align="right">{result.azimuth1.toFixed(4)}</TableCell>
                            <TableCell align="right">{result.reference_north.toFixed(2)}</TableCell>
                            <TableCell align="right">{result.reference_east.toFixed(2)}</TableCell>
                            <TableCell align="right">{result.reference_tvd.toFixed(2)}</TableCell>
                            <TableCell align="right">{result.inclination2.toFixed(4)}</TableCell>
                            <TableCell align="right">{result.azimuth2.toFixed(4)}</TableCell>
                            <TableCell align="right">{result.comparison_north.toFixed(2)}</TableCell>
                            <TableCell align="right">{result.comparison_east.toFixed(2)}</TableCell>
                            <TableCell align="right">{result.comparison_tvd.toFixed(2)}</TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: getDeltaColor(result.inc_diff, 0.5, 1.0),
                                fontWeight: Math.abs(result.inc_diff) > 0.5 ? 'bold' : 'normal'
                              }}
                            >
                              {result.inc_diff.toFixed(4)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: getDeltaColor(result.azi_diff, 0.5, 1.0),
                                fontWeight: Math.abs(result.azi_diff) > 0.5 ? 'bold' : 'normal'
                              }}
                            >
                              {result.azi_diff.toFixed(4)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: getDeltaColor(result.delta_north, 0.1, 0.5),
                                fontWeight: Math.abs(result.delta_north) > 0.1 ? 'bold' : 'normal'
                              }}
                            >
                              {result.delta_north.toFixed(4)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: getDeltaColor(result.delta_east, 0.1, 0.5),
                                fontWeight: Math.abs(result.delta_east) > 0.1 ? 'bold' : 'normal'
                              }}
                            >
                              {result.delta_east.toFixed(4)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: getDeltaColor(result.delta_tvd, 0.1, 0.5),
                                fontWeight: Math.abs(result.delta_tvd) > 0.1 ? 'bold' : 'normal'
                              }}
                            >
                              {result.delta_tvd.toFixed(4)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: getDeltaColor(result.displacement, 0.2, 1.0),
                                fontWeight: Math.abs(result.displacement) > 0.2 ? 'bold' : 'normal',
                                backgroundColor: Math.abs(result.displacement) > 1.0 ? '#ffebee' : 'inherit'
                              }}
                            >
                              {result.displacement.toFixed(4)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                </Box>
              )}

              {/* Tab 1: Statistical Summary */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Overview Statistics
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={3}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">
                          {comparisonData.results.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Comparison Points
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'error.50', textAlign: 'center' }}>
                        <Typography variant="h4" color="error">
                          {Math.max(...comparisonData.results.map(r => r.displacement)).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Max Displacement (m)
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'warning.50', textAlign: 'center' }}>
                        <Typography variant="h4" color="warning.dark">
                          {(comparisonData.results.reduce((sum, r) => sum + r.displacement, 0) / comparisonData.results.length).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Avg Displacement (m)
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.50', textAlign: 'center' }}>
                        <Typography variant="h4" color="success.dark">
                          {Math.max(...comparisonData.results.map(r => Math.abs(r.inc_diff))).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Max Inc Diff (°)
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Angular Differences Table */}
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Angular Differences
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell><strong>Metric</strong></TableCell>
                          <TableCell align="right"><strong>Inclination (°)</strong></TableCell>
                          <TableCell align="right"><strong>Azimuth (°)</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Maximum Absolute</TableCell>
                          <TableCell align="right">
                            {Math.max(...comparisonData.results.map(r => Math.abs(r.inc_diff))).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.max(...comparisonData.results.map(r => Math.abs(r.azi_diff))).toFixed(4)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Average Absolute</TableCell>
                          <TableCell align="right">
                            {(comparisonData.results.reduce((sum, r) => sum + Math.abs(r.inc_diff), 0) / comparisonData.results.length).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {(comparisonData.results.reduce((sum, r) => sum + Math.abs(r.azi_diff), 0) / comparisonData.results.length).toFixed(4)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Position Deltas Table */}
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Position Deltas
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell><strong>Metric</strong></TableCell>
                          <TableCell align="right"><strong>Delta North (m)</strong></TableCell>
                          <TableCell align="right"><strong>Delta East (m)</strong></TableCell>
                          <TableCell align="right"><strong>Delta TVD (m)</strong></TableCell>
                          <TableCell align="right"><strong>Displacement (m)</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Maximum Absolute</TableCell>
                          <TableCell align="right">
                            {Math.max(...comparisonData.results.map(r => Math.abs(r.delta_north))).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.max(...comparisonData.results.map(r => Math.abs(r.delta_east))).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.max(...comparisonData.results.map(r => Math.abs(r.delta_tvd))).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.max(...comparisonData.results.map(r => r.displacement)).toFixed(4)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Average Absolute</TableCell>
                          <TableCell align="right">
                            {(comparisonData.results.reduce((sum, r) => sum + Math.abs(r.delta_north), 0) / comparisonData.results.length).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {(comparisonData.results.reduce((sum, r) => sum + Math.abs(r.delta_east), 0) / comparisonData.results.length).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {(comparisonData.results.reduce((sum, r) => sum + Math.abs(r.delta_tvd), 0) / comparisonData.results.length).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {(comparisonData.results.reduce((sum, r) => sum + r.displacement, 0) / comparisonData.results.length).toFixed(4)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Deviations at Key Depths */}
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Deviations at Key Depths
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell><strong>Position</strong></TableCell>
                          <TableCell align="right"><strong>Depth (m)</strong></TableCell>
                          <TableCell align="right"><strong>Delta North (m)</strong></TableCell>
                          <TableCell align="right"><strong>Delta East (m)</strong></TableCell>
                          <TableCell align="right"><strong>Delta TVD (m)</strong></TableCell>
                          <TableCell align="right"><strong>Displacement (m)</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {/* Start (first point) */}
                        <TableRow>
                          <TableCell>Start</TableCell>
                          <TableCell align="right">
                            {comparisonData.results[0].depth.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[0].delta_north).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[0].delta_east).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[0].delta_tvd).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {comparisonData.results[0].displacement.toFixed(4)}
                          </TableCell>
                        </TableRow>

                        {/* 25% */}
                        <TableRow>
                          <TableCell>25%</TableCell>
                          <TableCell align="right">
                            {comparisonData.results[Math.floor(comparisonData.results.length * 0.25)].depth.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.25)].delta_north).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.25)].delta_east).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.25)].delta_tvd).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {comparisonData.results[Math.floor(comparisonData.results.length * 0.25)].displacement.toFixed(4)}
                          </TableCell>
                        </TableRow>

                        {/* 50% */}
                        <TableRow>
                          <TableCell>50%</TableCell>
                          <TableCell align="right">
                            {comparisonData.results[Math.floor(comparisonData.results.length * 0.5)].depth.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.5)].delta_north).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.5)].delta_east).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.5)].delta_tvd).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {comparisonData.results[Math.floor(comparisonData.results.length * 0.5)].displacement.toFixed(4)}
                          </TableCell>
                        </TableRow>

                        {/* 75% */}
                        <TableRow>
                          <TableCell>75%</TableCell>
                          <TableCell align="right">
                            {comparisonData.results[Math.floor(comparisonData.results.length * 0.75)].depth.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.75)].delta_north).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.75)].delta_east).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.75)].delta_tvd).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {comparisonData.results[Math.floor(comparisonData.results.length * 0.75)].displacement.toFixed(4)}
                          </TableCell>
                        </TableRow>

                        {/* End (last point) */}
                        <TableRow>
                          <TableCell>End</TableCell>
                          <TableCell align="right">
                            {comparisonData.results[comparisonData.results.length - 1].depth.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[comparisonData.results.length - 1].delta_north).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[comparisonData.results.length - 1].delta_east).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {Math.abs(comparisonData.results[comparisonData.results.length - 1].delta_tvd).toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            {comparisonData.results[comparisonData.results.length - 1].displacement.toFixed(4)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Tab 2: 3D Plot */}
              {activeTab === 2 && (
                <Box>
                  <Plot
                    data={[
                      {
                        x: comparisonData.reference_easting,
                        y: comparisonData.reference_northing,
                        z: comparisonData.reference_tvd,
                        mode: 'lines',
                        type: 'scatter3d',
                        name: 'Reference Survey',
                        line: {
                          color: 'blue',
                          width: 4,
                        },
                      },
                      {
                        x: comparisonData.comparison_easting,
                        y: comparisonData.comparison_northing,
                        z: comparisonData.comparison_tvd,
                        mode: 'lines',
                        type: 'scatter3d',
                        name: 'Comparison Survey',
                        line: {
                          color: 'red',
                          width: 4,
                        },
                      },
                    ]}
                    layout={{
                      scene: {
                        xaxis: { title: 'East [m]' },
                        yaxis: { title: 'North [m]' },
                        zaxis: { title: 'TVD [m]', autorange: 'reversed' as const },
                        aspectmode: 'cube' as const,
                      },
                      height: 800,
                      showlegend: true,
                      legend: { x: 0, y: 1, bgcolor: 'rgba(255, 255, 255, 0.8)' },
                      hovermode: 'closest' as const,
                      autosize: true,
                      margin: { l: 0, r: 0, t: 40, b: 0 },
                    }}
                    config={{
                      displayModeBar: true,
                      displaylogo: false,
                      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
                      toImageButtonOptions: {
                        format: 'png' as const,
                        filename: 'comparison_3d_plot',
                        height: 1000,
                        width: 1400,
                        scale: 2,
                      },
                    }}
                    style={{ width: '100%', height: '800px' }}
                    useResizeHandler
                  />
                </Box>
              )}

              {/* Tab 3: Inclination Comparison */}
              {activeTab === 3 && (
                <Box>
                  <Plot
                    data={[
                      {
                        x: comparisonData.results.map(r => r.depth),
                        y: comparisonData.results.map(r => r.inclination1),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Survey 1',
                        marker: { color: '#1976d2', size: 4 },
                        line: { width: 2 }
                      },
                      {
                        x: comparisonData.results.map(r => r.depth),
                        y: comparisonData.results.map(r => r.inclination2),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Survey 2',
                        marker: { color: '#dc004e', size: 4 },
                        line: { width: 2 }
                      }
                    ]}
                    layout={{
                      title: 'Inclination Comparison vs Depth',
                      xaxis: { title: 'Depth (m)' },
                      yaxis: { title: 'Inclination (°)' },
                      autosize: true,
                      height: 500,
                      hovermode: 'closest',
                      showlegend: true,
                      legend: { x: 0.02, y: 0.98 }
                    }}
                    config={{ responsive: true }}
                    style={{ width: '100%', height: '500px' }}
                  />
                </Box>
              )}

              {/* Tab 4: Azimuth Comparison */}
              {activeTab === 4 && (
                <Box>
                  <Plot
                    data={[
                      {
                        x: comparisonData.results.map(r => r.depth),
                        y: comparisonData.results.map(r => r.azimuth1),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Survey 1',
                        marker: { color: '#1976d2', size: 4 },
                        line: { width: 2 }
                      },
                      {
                        x: comparisonData.results.map(r => r.depth),
                        y: comparisonData.results.map(r => r.azimuth2),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Survey 2',
                        marker: { color: '#dc004e', size: 4 },
                        line: { width: 2 }
                      }
                    ]}
                    layout={{
                      title: 'Azimuth Comparison vs Depth',
                      xaxis: { title: 'Depth (m)' },
                      yaxis: { title: 'Azimuth (°)' },
                      autosize: true,
                      height: 500,
                      hovermode: 'closest',
                      showlegend: true,
                      legend: { x: 0.02, y: 0.98 }
                    }}
                    config={{ responsive: true }}
                    style={{ width: '100%', height: '500px' }}
                  />
                </Box>
              )}

              {/* Tab 5: Inclination Difference */}
              {activeTab === 5 && (
                <Box>
                  <Plot
                    data={[
                      {
                        x: comparisonData.results.map(r => r.depth),
                        y: comparisonData.results.map(r => r.inc_diff),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Inc Difference',
                        marker: {
                          color: comparisonData.results.map(r => Math.abs(r.inc_diff) > 0.5 ? '#d32f2f' : '#2e7d32'),
                          size: 6
                        },
                        line: { width: 2, color: '#ff6f00' }
                      }
                    ]}
                    layout={{
                      title: 'Inclination Difference vs Depth',
                      xaxis: { title: 'Depth (m)' },
                      yaxis: { title: 'Inclination Difference (°)', zeroline: true },
                      autosize: true,
                      height: 500,
                      hovermode: 'closest',
                      showlegend: true,
                      shapes: [
                        {
                          type: 'line',
                          x0: Math.min(...comparisonData.results.map(r => r.depth)),
                          x1: Math.max(...comparisonData.results.map(r => r.depth)),
                          y0: 0,
                          y1: 0,
                          line: { color: 'gray', width: 1, dash: 'dash' }
                        }
                      ]
                    }}
                    config={{ responsive: true }}
                    style={{ width: '100%', height: '500px' }}
                  />
                </Box>
              )}

              {/* Tab 6: Azimuth Difference */}
              {activeTab === 6 && (
                <Box>
                  <Plot
                    data={[
                      {
                        x: comparisonData.results.map(r => r.depth),
                        y: comparisonData.results.map(r => r.azi_diff),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Azi Difference',
                        marker: {
                          color: comparisonData.results.map(r => Math.abs(r.azi_diff) > 0.5 ? '#d32f2f' : '#2e7d32'),
                          size: 6
                        },
                        line: { width: 2, color: '#673ab7' }
                      }
                    ]}
                    layout={{
                      title: 'Azimuth Difference vs Depth',
                      xaxis: { title: 'Depth (m)' },
                      yaxis: { title: 'Azimuth Difference (°)', zeroline: true },
                      autosize: true,
                      height: 500,
                      hovermode: 'closest',
                      showlegend: true,
                      shapes: [
                        {
                          type: 'line',
                          x0: Math.min(...comparisonData.results.map(r => r.depth)),
                          x1: Math.max(...comparisonData.results.map(r => r.depth)),
                          y0: 0,
                          y1: 0,
                          line: { color: 'gray', width: 1, dash: 'dash' }
                        }
                      ]
                    }}
                    config={{ responsive: true }}
                    style={{ width: '100%', height: '500px' }}
                  />
                </Box>
              )}

              {/* Tab 7: Horizontal/Vertical Delta */}
              {activeTab === 7 && (
                <Box>
                  <Plot
                    data={[
                      {
                        x: comparisonData.results.map(r => r.depth),
                        y: comparisonData.results.map(r => r.delta_horizontal),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Horizontal Delta',
                        marker: { color: '#00897b', size: 4 },
                        line: { width: 2 },
                        yaxis: 'y'
                      },
                      {
                        x: comparisonData.results.map(r => r.depth),
                        y: comparisonData.results.map(r => r.delta_vertical),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Vertical Delta',
                        marker: { color: '#e64a19', size: 4 },
                        line: { width: 2 },
                        yaxis: 'y2'
                      }
                    ]}
                    layout={{
                      title: 'Horizontal and Vertical Delta vs Depth',
                      xaxis: { title: 'Depth (m)' },
                      yaxis: {
                        title: 'Horizontal Delta (m)',
                        titlefont: { color: '#00897b' },
                        tickfont: { color: '#00897b' }
                      },
                      yaxis2: {
                        title: 'Vertical Delta (m)',
                        titlefont: { color: '#e64a19' },
                        tickfont: { color: '#e64a19' },
                        overlaying: 'y',
                        side: 'right'
                      },
                      autosize: true,
                      height: 500,
                      hovermode: 'closest',
                      showlegend: true,
                      legend: { x: 0.02, y: 0.98 }
                    }}
                    config={{ responsive: true }}
                    style={{ width: '100%', height: '500px' }}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};
