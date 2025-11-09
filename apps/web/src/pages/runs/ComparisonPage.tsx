/**
 * ComparisonPage Component
 *
 * Survey comparison page matching Job Comparison format with all tabs.
 * Results are calculated but NOT saved to DB until user clicks "Save Data" button.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CompareArrows as CompareIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import Plot from 'react-plotly.js';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { useGetRunByIdQuery } from '../../stores/runsSlice';
import { useCalculateComparison, useCreateComparison } from '../../hooks/useComparison';

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

export const ComparisonPage: React.FC = () => {
  const { id: runId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Fetch run details
  const { data: run, isLoading: runLoading, error: runError } = useGetRunByIdQuery(runId!);

  // Comparison hooks
  const { calculateComparison, isCalculating, error: calcError, reset: resetCalc } = useCalculateComparison();
  const { createComparison, isCreating, error: saveError, reset: resetSave } = useCreateComparison();

  // State
  const [selectedPrimary, setSelectedPrimary] = useState<string>(''); // Survey File ID for calculation
  const [selectedReference, setSelectedReference] = useState<string>(''); // Survey File ID for calculation
  const [selectedPrimaryDataId, setSelectedPrimaryDataId] = useState<string>(''); // Survey Data ID for saving
  const [selectedReferenceDataId, setSelectedReferenceDataId] = useState<string>(''); // Survey Data ID for saving
  const [resolution, setResolution] = useState<number | string>(5);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [autoTriggerProcessed, setAutoTriggerProcessed] = useState(false);

  // Get completed surveys
  const completedSurveys = run?.survey_files?.filter(
    (file) => file.processing_status === 'completed' && file.survey_data_id
  ) || [];

  // Handle URL parameters for auto-triggering comparison
  useEffect(() => {
    const primaryParam = searchParams.get('primary');
    const referenceParam = searchParams.get('reference');
    const autoParam = searchParams.get('auto');

    if (autoParam === 'true' && primaryParam && referenceParam && run && !autoTriggerProcessed) {
      // Find the surveys to get both file ID and data ID
      const primarySurvey = completedSurveys.find(s => s.id === primaryParam);
      const referenceSurvey = completedSurveys.find(s => s.id === referenceParam);

      if (primarySurvey && referenceSurvey) {
        setSelectedPrimary(primaryParam);
        setSelectedReference(referenceParam);
        setSelectedPrimaryDataId(primarySurvey.survey_data_id);
        setSelectedReferenceDataId(referenceSurvey.survey_data_id);
      }

      setAutoTriggerProcessed(true);
      setSearchParams({});
    }
  }, [searchParams, run, autoTriggerProcessed, setSearchParams, completedSurveys]);

  // Auto-trigger comparison when state is set from URL parameters
  useEffect(() => {
    if (autoTriggerProcessed && selectedPrimary && selectedReference && !comparisonData && !isCalculating) {
      handleCompare();
    }
  }, [autoTriggerProcessed, selectedPrimary, selectedReference]);

  const handleCompare = async () => {
    if (!selectedPrimary || !selectedReference) {
      setError('Please select both surveys');
      return;
    }

    const resolutionNum = Number(resolution);
    if (!resolution || isNaN(resolutionNum) || resolutionNum < 1 || resolutionNum > 100) {
      setError('Resolution must be between 1 and 100');
      setResolution(5);
      return;
    }

    setError(null);

    try {
      const result = await calculateComparison({
        primarySurveyId: selectedPrimary,
        referenceSurveyId: selectedReference,
        resolution: resolutionNum,
      });

      setComparisonData(result as ComparisonData);
      resetCalc();
    } catch (err: any) {
      console.error('Comparison error:', err);
      setError(err.message || 'Failed to perform comparison');
    }
  };

  const handleSaveData = async () => {
    if (!runId || !selectedPrimaryDataId || !selectedReferenceDataId || !comparisonData) return;

    try {
      await createComparison({
        run_id: runId,
        primary_survey_id: selectedPrimaryDataId,
        reference_survey_id: selectedReferenceDataId,
        ratio_factor: Number(resolution),
      });

      setSaveSuccess(true);
      resetSave();
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save comparison');
    }
  };

  const handleReset = () => {
    setComparisonData(null);
    setSelectedPrimary('');
    setSelectedReference('');
    setSelectedPrimaryDataId('');
    setSelectedReferenceDataId('');
    setResolution(5);
    setError(null);
    resetCalc();
    resetSave();
  };

  if (runLoading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (runError || !run) {
    return (
      <Container maxWidth="xl">
        <ErrorAlert
          message="Failed to load run details. Please try again."
          onRetry={() => window.location.reload()}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <PageHeader
        title={`Survey Comparison - ${run.run_name}`}
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Runs', path: '/runs' },
          { label: run.run_name, path: `/runs/${runId}` },
          { label: 'Comparison' },
        ]}
      />

      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/runs/${runId}`)}
        sx={{ mb: 3 }}
      >
        Back to Run
      </Button>

      <Grid container spacing={3}>
        {/* Selection Panel */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Select Surveys to Compare
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* Primary Survey Selection */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom color="primary">
                    Comparative Survey
                  </Typography>

                  <FormControl fullWidth>
                    <InputLabel>Select Primary Survey</InputLabel>
                    <Select
                      value={selectedPrimary}
                      label="Select Primary Survey"
                      onChange={(e) => {
                        const selectedSurvey = completedSurveys.find(s => s.id === e.target.value);
                        setSelectedPrimary(e.target.value);
                        setSelectedPrimaryDataId(selectedSurvey?.survey_data_id || '');
                      }}
                      disabled={isCalculating}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {completedSurveys.map((survey) => (
                        <MenuItem key={survey.id} value={survey.id}>
                          {survey.filename} - {survey.survey_type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Paper>
              </Grid>

              {/* Reference Survey Selection */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom color="secondary">
                    Reference Survey
                  </Typography>

                  <FormControl fullWidth>
                    <InputLabel>Select Reference Survey</InputLabel>
                    <Select
                      value={selectedReference}
                      label="Select Reference Survey"
                      onChange={(e) => {
                        const selectedSurvey = completedSurveys.find(s => s.id === e.target.value);
                        setSelectedReference(e.target.value);
                        setSelectedReferenceDataId(selectedSurvey?.survey_data_id || '');
                      }}
                      disabled={isCalculating}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {completedSurveys.map((survey) => (
                        <MenuItem
                          key={survey.id}
                          value={survey.id}
                          disabled={survey.id === selectedPrimary}
                        >
                          {survey.filename} - {survey.survey_type}
                        </MenuItem>
                      ))}
                    </Select>
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
                            setResolution('' as any);
                          } else {
                            const numVal = Number(val);
                            if (numVal >= 0) {
                              setResolution(numVal);
                            }
                          }
                        }}
                        onBlur={(e) => {
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
                        disabled={isCalculating}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Compare and Reset Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleReset}
                    disabled={isCalculating || (!selectedPrimary && !selectedReference && !comparisonData)}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<CompareIcon />}
                    onClick={handleCompare}
                    disabled={!selectedPrimary || !selectedReference || isCalculating}
                  >
                    {isCalculating ? 'Calculating...' : 'Compare'}
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
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Comparison Results
                </Typography>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveData}
                  disabled={isCreating}
                >
                  {isCreating ? 'Saving...' : 'Save Data'}
                </Button>
              </Box>
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
                          const getDeltaColor = (value: number, threshold1: number = 0.5, threshold2: number = 1.0) => {
                            const absValue = Math.abs(value);
                            if (absValue < threshold1) return '#4caf50';
                            if (absValue < threshold2) return '#ff9800';
                            return '#f44336';
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
                        <TableRow>
                          <TableCell>Start</TableCell>
                          <TableCell align="right">{comparisonData.results[0].depth.toFixed(2)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[0].delta_north).toFixed(4)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[0].delta_east).toFixed(4)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[0].delta_tvd).toFixed(4)}</TableCell>
                          <TableCell align="right">{comparisonData.results[0].displacement.toFixed(4)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>25%</TableCell>
                          <TableCell align="right">{comparisonData.results[Math.floor(comparisonData.results.length * 0.25)].depth.toFixed(2)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.25)].delta_north).toFixed(4)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.25)].delta_east).toFixed(4)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.25)].delta_tvd).toFixed(4)}</TableCell>
                          <TableCell align="right">{comparisonData.results[Math.floor(comparisonData.results.length * 0.25)].displacement.toFixed(4)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>50%</TableCell>
                          <TableCell align="right">{comparisonData.results[Math.floor(comparisonData.results.length * 0.5)].depth.toFixed(2)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.5)].delta_north).toFixed(4)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.5)].delta_east).toFixed(4)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.5)].delta_tvd).toFixed(4)}</TableCell>
                          <TableCell align="right">{comparisonData.results[Math.floor(comparisonData.results.length * 0.5)].displacement.toFixed(4)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>75%</TableCell>
                          <TableCell align="right">{comparisonData.results[Math.floor(comparisonData.results.length * 0.75)].depth.toFixed(2)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.75)].delta_north).toFixed(4)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.75)].delta_east).toFixed(4)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[Math.floor(comparisonData.results.length * 0.75)].delta_tvd).toFixed(4)}</TableCell>
                          <TableCell align="right">{comparisonData.results[Math.floor(comparisonData.results.length * 0.75)].displacement.toFixed(4)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>End</TableCell>
                          <TableCell align="right">{comparisonData.results[comparisonData.results.length - 1].depth.toFixed(2)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[comparisonData.results.length - 1].delta_north).toFixed(4)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[comparisonData.results.length - 1].delta_east).toFixed(4)}</TableCell>
                          <TableCell align="right">{Math.abs(comparisonData.results[comparisonData.results.length - 1].delta_tvd).toFixed(4)}</TableCell>
                          <TableCell align="right">{comparisonData.results[comparisonData.results.length - 1].displacement.toFixed(4)}</TableCell>
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
                        name: 'Reference',
                        marker: { color: '#1976d2', size: 4 },
                        line: { width: 2 }
                      },
                      {
                        x: comparisonData.results.map(r => r.depth),
                        y: comparisonData.results.map(r => r.inclination2),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Comparison',
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
                        name: 'Reference',
                        marker: { color: '#1976d2', size: 4 },
                        line: { width: 2 }
                      },
                      {
                        x: comparisonData.results.map(r => r.depth),
                        y: comparisonData.results.map(r => r.azimuth2),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Comparison',
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

      {/* Success Snackbar */}
      <Snackbar
        open={saveSuccess}
        autoHideDuration={6000}
        onClose={() => setSaveSuccess(false)}
        message="Comparison data saved successfully!"
      />
    </Container>
  );
};
