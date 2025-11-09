import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  TextField,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Tune as AdjustIcon,
} from '@mui/icons-material';
import Plot from 'react-plotly.js';
import { PageHeader } from '../../components/common/PageHeader';
import { useGetJobByIdQuery, useGetJobRunsQuery } from '../../stores/jobsSlice';

interface SurveyFile {
  id: string;
  filename: string;
  file_type: string;
  uploaded_at: string;
}

interface AdjustmentResult {
  depth: number;
  inclination: number;
  azimuth: number;
  reference_north: number;
  reference_east: number;
  reference_tvd: number;
  adjusted_north: number;
  adjusted_east: number;
  adjusted_tvd: number;
  delta_north: number;
  delta_east: number;
  delta_tvd: number;
  delta_horizontal: number;
  delta_total: number;
}

interface AdjustmentData {
  results: AdjustmentResult[];
  statistics: any;
  file1_name: string;
  file2_name: string;
  adjustment_params: {
    md_start: number;
    md_end: number;
    x_offset: number;
    y_offset: number;
    z_offset: number;
  };
  reference_easting: number[];
  reference_northing: number[];
  reference_tvd: number[];
  adjusted_easting: number[];
  adjusted_northing: number[];
  adjusted_tvd: number[];
}

export const JobAdjustmentPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const { data: job, isLoading: loadingJob, error: jobError } = useGetJobByIdQuery(jobId!);
  const { data: runs, isLoading: loadingRuns } = useGetJobRunsQuery(jobId!);

  // Selection states
  const [selectedRun1, setSelectedRun1] = useState<string>('');
  const [selectedRun2, setSelectedRun2] = useState<string>('');
  const [selectedFile1, setSelectedFile1] = useState<string>('');
  const [selectedFile2, setSelectedFile2] = useState<string>('');

  // Files and adjustment data
  const [filesRun1, setFilesRun1] = useState<SurveyFile[]>([]);
  const [filesRun2, setFilesRun2] = useState<SurveyFile[]>([]);
  const [loadingFiles1, setLoadingFiles1] = useState(false);
  const [loadingFiles2, setLoadingFiles2] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState<AdjustmentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [dataSubTab, setDataSubTab] = useState(0);  // For nested tabs in Data Table

  // State management for cumulative adjustments (like Streamlit session_state)
  const [adjustedSurvey, setAdjustedSurvey] = useState<AdjustmentData | null>(null);
  const [history, setHistory] = useState<AdjustmentData[]>([]);
  const [future, setFuture] = useState<AdjustmentData[]>([]);
  const [originalData, setOriginalData] = useState<AdjustmentData | null>(null);

  // Adjustment parameters
  const [mdStart, setMdStart] = useState<number | string>(0);
  const [mdEnd, setMdEnd] = useState<number | string>(99999);
  const [xOffset, setXOffset] = useState<number | string>(0);
  const [yOffset, setYOffset] = useState<number | string>(0);
  const [zOffset, setZOffset] = useState<number | string>(0);

  // Recalculated data
  const [recalculatedData, setRecalculatedData] = useState<any[] | null>(null);

  // Fetch files when run is selected
  const fetchRunFiles = async (
    runId: string,
    setFiles: React.Dispatch<React.SetStateAction<SurveyFile[]>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/v1/runs/${runId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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

  // No need for separate MD range fetching - will get it from comparison response

  // Initial comparison - load data without offsets
  const handleInitialComparison = async () => {
    if (!selectedFile1 || !selectedFile2) {
      setError('Please select files from both runs');
      return;
    }

    setAdjusting(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/v1/adjustments/adjust/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          file1_id: selectedFile1,
          file2_id: selectedFile2,
          md_start: Number(mdStart),
          md_end: Number(mdEnd),
          x_offset: 0, // No offsets for initial comparison
          y_offset: 0,
          z_offset: 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData) {
          const errorMsg = errorData.message || errorData.error || 'Comparison failed';
          const details = errorData.details ? `\n\nDetails: ${errorData.details}` : '';
          throw new Error(`${errorMsg}${details}`);
        }
        throw new Error('Comparison failed');
      }

      const data = await response.json();

      // Extract MD range from the response and update state
      if (data.statistics?.md_range) {
        setMdStart(data.statistics.md_range.min);
        setMdEnd(data.statistics.md_range.max);
      }

      setOriginalData(data); // Store original for reset
      setAdjustmentData(data); // Display initial comparison
      setAdjustedSurvey(null); // No adjustments yet
      setHistory([]); // Clear history
      setFuture([]); // Clear future
      setActiveTab(1); // Switch to 3D Graphs tab to show the visualization
    } catch (err: any) {
      console.error('Comparison error:', err);
      setError(err.message || 'Failed to perform comparison');
    } finally {
      setAdjusting(false);
    }
  };

  // Apply offsets (cumulative)
  const handleApplyOffsets = async () => {
    if (!adjustmentData) {
      setError('Please load comparison data first');
      return;
    }

    setAdjusting(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');

      // Use adjusted survey as base, or original if no adjustments yet
      const baseData = adjustedSurvey || adjustmentData;

      const response = await fetch('http://localhost:8000/api/v1/adjustments/adjust/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          file1_id: selectedFile1,
          file2_id: selectedFile2,
          md_start: Number(mdStart),
          md_end: Number(mdEnd),
          x_offset: Number(xOffset),
          y_offset: Number(yOffset),
          z_offset: Number(zOffset),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply offsets');
      }

      const data = await response.json();

      // Save current state to history for undo
      if (adjustedSurvey) {
        setHistory([...history, adjustedSurvey]);
      } else if (adjustmentData) {
        setHistory([...history, adjustmentData]);
      }

      // Clear future (new branch of changes)
      setFuture([]);

      // Update adjusted survey
      setAdjustedSurvey(data);
      setAdjustmentData(data); // Update display

      // Reset offset inputs
      setXOffset(0);
      setYOffset(0);
      setZOffset(0);
    } catch (err: any) {
      console.error('Apply offsets error:', err);
      setError(err.message || 'Failed to apply offsets');
    } finally {
      setAdjusting(false);
    }
  };

  // Undo last change
  const handleUndo = () => {
    if (history.length === 0) {
      setError('No previous changes to undo');
      return;
    }

    // Move current to future
    if (adjustedSurvey) {
      setFuture([adjustedSurvey, ...future]);
    }

    // Pop from history
    const previous = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setAdjustedSurvey(previous);
    setAdjustmentData(previous);
    setError(null);
  };

  // Redo
  const handleRedo = () => {
    if (future.length === 0) {
      setError('No forward state to redo');
      return;
    }

    // Move current to history
    if (adjustedSurvey) {
      setHistory([...history, adjustedSurvey]);
    }

    // Pop from future
    const next = future[0];
    setFuture(future.slice(1));
    setAdjustedSurvey(next);
    setAdjustmentData(next);
    setError(null);
  };

  // Reset to original
  const handleReset = () => {
    if (!originalData) {
      setError('No original data to reset to');
      return;
    }

    setAdjustedSurvey(null);
    setAdjustmentData(originalData);
    setHistory([]);
    setFuture([]);
    setXOffset(0);
    setYOffset(0);
    setZOffset(0);
    setRecalculatedData(null);
    setError(null);
  };

  // Recalculate MD/INC/AZI from adjusted path
  const handleRecalculate = () => {
    if (!adjustmentData) {
      setError('No adjustment data available. Please load comparison first.');
      return;
    }

    try {
      // Extract adjusted coordinates from results
      const mdVals = adjustmentData.results.map(r => r.depth);
      const nAdj = adjustmentData.results.map(r => r.adjusted_north);
      const eAdj = adjustmentData.results.map(r => r.adjusted_east);
      const tvdAdj = adjustmentData.results.map(r => r.adjusted_tvd);

      // Calculate gradients relative to MD (similar to numpy.gradient)
      const gradient = (arr: number[], md: number[]) => {
        const grad: number[] = [];
        for (let i = 0; i < arr.length; i++) {
          if (i === 0) {
            // Forward difference for first point
            grad.push((arr[i + 1] - arr[i]) / (md[i + 1] - md[i]));
          } else if (i === arr.length - 1) {
            // Backward difference for last point
            grad.push((arr[i] - arr[i - 1]) / (md[i] - md[i - 1]));
          } else {
            // Central difference for middle points
            grad.push((arr[i + 1] - arr[i - 1]) / (md[i + 1] - md[i - 1]));
          }
        }
        return grad;
      };

      const dN = gradient(nAdj, mdVals);
      const dE = gradient(eAdj, mdVals);
      const dTVD = gradient(tvdAdj, mdVals);

      // Compute INC & AZI from gradients
      const recalculated = mdVals.map((md, i) => {
        // INC = arctan2(sqrt(dN^2 + dE^2), dTVD)
        const horizontalGrad = Math.sqrt(dN[i] ** 2 + dE[i] ** 2);
        const incRad = Math.atan2(horizontalGrad, dTVD[i]);
        const incDeg = (incRad * 180) / Math.PI;

        // AZI = (arctan2(dE, dN) + 360) % 360
        const aziRad = Math.atan2(dE[i], dN[i]);
        let aziDeg = (aziRad * 180) / Math.PI;
        aziDeg = (aziDeg + 360) % 360;

        return {
          md,
          north: nAdj[i],
          east: eAdj[i],
          tvd: tvdAdj[i],
          inc_recalc: incDeg,
          azi_recalc: aziDeg,
        };
      });

      setRecalculatedData(recalculated);
      setError(null);
    } catch (err: any) {
      console.error('Recalculation error:', err);
      setError('Failed to recalculate INC/AZI: ' + err.message);
    }
  };

  const getDeltaColor = (value: number, threshold1: number = 0.5, threshold2: number = 1.0) => {
    const absValue = Math.abs(value);
    if (absValue < threshold1) return '#4caf50';
    if (absValue < threshold2) return '#ff9800';
    return '#f44336';
  };

  if (loadingJob) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (jobError || !job) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error">
          Failed to load job details. Please try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <PageHeader
        title="Survey Adjustment"
        subtitle={`Job: ${job?.job_name || ''}`}
        onBack={() => navigate(`/jobs/${jobId}`)}
      />

      {/* Setup Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Setup
        </Typography>

        <Grid container spacing={3}>
          {/* Reference Survey (Run 1) */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Reference Survey
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Run 1 (Reference)</InputLabel>
              <Select
                value={selectedRun1}
                label="Select Run 1 (Reference)"
                onChange={(e) => setSelectedRun1(e.target.value)}
              >
                {runs?.map((run: any) => (
                  <MenuItem key={run.id} value={run.id}>
                    {run.run_number} - {run.run_name} ({run.survey_type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={!selectedRun1 || loadingFiles1}>
              <InputLabel>Select File 1 (Reference)</InputLabel>
              <Select
                value={selectedFile1}
                label="Select File 1 (Reference)"
                onChange={(e) => setSelectedFile1(e.target.value)}
              >
                {filesRun1.map((file) => (
                  <MenuItem key={file.id} value={file.id}>
                    {file.filename}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Comparison Survey (Run 2) */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="secondary" gutterBottom>
              Comparison Survey (to be adjusted)
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Run 2 (Comparison)</InputLabel>
              <Select
                value={selectedRun2}
                label="Select Run 2 (Comparison)"
                onChange={(e) => setSelectedRun2(e.target.value)}
              >
                {runs?.map((run: any) => (
                  <MenuItem key={run.id} value={run.id}>
                    {run.run_number} - {run.run_name} ({run.survey_type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={!selectedRun2 || loadingFiles2}>
              <InputLabel>Select File 2 (Comparison)</InputLabel>
              <Select
                value={selectedFile2}
                label="Select File 2 (Comparison)"
                onChange={(e) => setSelectedFile2(e.target.value)}
              >
                {filesRun2.map((file) => (
                  <MenuItem key={file.id} value={file.id}>
                    {file.filename}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          {/* Show Load Comparison button if no data loaded yet */}
          {!adjustmentData && (
            <Grid item xs={12}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={adjusting ? <CircularProgress size={20} color="inherit" /> : <AdjustIcon />}
                onClick={handleInitialComparison}
                disabled={!selectedFile1 || !selectedFile2 || adjusting}
              >
                {adjusting ? 'Loading Comparison...' : 'Load Comparison'}
              </Button>
            </Grid>
          )}

          {/* Show adjustment parameters and action buttons after data is loaded */}
          {adjustmentData && (
            <>
              {/* Adjustment Parameters */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Adjustment Parameters
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="MD Start (meters)"
                  type="number"
                  value={mdStart}
                  onChange={(e) => setMdStart(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="MD End (meters)"
                  type="number"
                  value={mdEnd}
                  onChange={(e) => setMdEnd(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="X Offset (Easting, meters)"
                  type="number"
                  value={xOffset}
                  onChange={(e) => setXOffset(e.target.value)}
                  inputProps={{ step: 0.1 }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Y Offset (Northing, meters)"
                  type="number"
                  value={yOffset}
                  onChange={(e) => setYOffset(e.target.value)}
                  inputProps={{ step: 0.1 }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Z Offset (TVD, meters)"
                  type="number"
                  value={zOffset}
                  onChange={(e) => setZOffset(e.target.value)}
                  inputProps={{ step: 0.1 }}
                />
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    size="small"
                  >
                    Undo Last Change
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleRedo}
                    disabled={future.length === 0}
                    size="small"
                  >
                    Redo (Forward)
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={handleReset}
                    disabled={!originalData}
                    size="small"
                  >
                    Reset to Original
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={adjusting ? <CircularProgress size={20} color="inherit" /> : <AdjustIcon />}
                  onClick={handleApplyOffsets}
                  disabled={adjusting}
                >
                  {adjusting ? 'Applying Offsets...' : 'Apply Offsets'}
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Results Tabs */}
      {adjustmentData && (
        <Paper sx={{ mt: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Data Table" />
            <Tab label="3D Graphs" />
            <Tab label="Displacement vs MD" />
            <Tab label="Delta North & East vs MD" />
            <Tab label="Delta TVD vs MD" />
            <Tab label="Adjustment Summary" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* Tab 1: Data Table with nested tabs */}
            {activeTab === 0 && (
              <Box>
                <Tabs value={dataSubTab} onChange={(_, newValue) => setDataSubTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tab label="Comparison Result" />
                  <Tab label="Adjustment Result" />
                  <Tab label="Result Recalculate" />
                </Tabs>

                {/* Sub-tab 1: Comparison Result */}
                {dataSubTab === 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Comparison Result
                    </Typography>
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
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>MD (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>INC Ref (°)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>AZI Ref (°)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e9' }}>N Ref (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e9' }}>E Ref (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e9' }}>TVD Ref (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0' }}>INC Adj (°)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0' }}>AZI Adj (°)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffe0b2' }}>N Adj (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffe0b2' }}>E Adj (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffe0b2' }}>TVD Adj (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>ΔN (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>ΔE (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>ΔTVD (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffcdd2' }}>Δ Horiz (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffcdd2' }}>Displacement (m)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {adjustmentData.results.map((result, index) => (
                            <TableRow key={index} hover>
                              <TableCell>{result.depth.toFixed(2)}</TableCell>
                              <TableCell>{result.inclination.toFixed(2)}</TableCell>
                              <TableCell>{result.azimuth.toFixed(2)}</TableCell>
                              <TableCell>{result.reference_north.toFixed(3)}</TableCell>
                              <TableCell>{result.reference_east.toFixed(3)}</TableCell>
                              <TableCell>{result.reference_tvd.toFixed(3)}</TableCell>
                              <TableCell>{result.inclination.toFixed(2)}</TableCell>
                              <TableCell>{result.azimuth.toFixed(2)}</TableCell>
                              <TableCell>{result.adjusted_north.toFixed(3)}</TableCell>
                              <TableCell>{result.adjusted_east.toFixed(3)}</TableCell>
                              <TableCell>{result.adjusted_tvd.toFixed(3)}</TableCell>
                              <TableCell sx={{ backgroundColor: getDeltaColor(result.delta_north, 0.1, 0.5) }}>
                                {result.delta_north.toFixed(3)}
                              </TableCell>
                              <TableCell sx={{ backgroundColor: getDeltaColor(result.delta_east, 0.1, 0.5) }}>
                                {result.delta_east.toFixed(3)}
                              </TableCell>
                              <TableCell sx={{ backgroundColor: getDeltaColor(result.delta_tvd, 0.1, 0.5) }}>
                                {result.delta_tvd.toFixed(3)}
                              </TableCell>
                              <TableCell sx={{ backgroundColor: getDeltaColor(result.delta_horizontal, 0.2, 1.0) }}>
                                {result.delta_horizontal.toFixed(3)}
                              </TableCell>
                              <TableCell sx={{ backgroundColor: getDeltaColor(result.delta_total, 0.2, 1.0) }}>
                                {result.delta_total.toFixed(3)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Sub-tab 2: Adjustment Result */}
                {dataSubTab === 1 && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Adjustment Result (Adjusted Coordinates)
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleRecalculate}
                        disabled={!adjustmentData}
                      >
                        Recalculate MD/INC/AZI from Adjusted Path
                      </Button>
                    </Box>
                    {/* {recalculatedData && (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        INC and AZI have been recalculated from the adjusted wellbore path using gradient calculations (dN/dMD, dE/dMD, dTVD/dMD).
                      </Alert>
                    )} */}
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
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>MD (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffe0b2' }}>North Adj (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffe0b2' }}>East Adj (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffe0b2' }}>TVD Adj (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>INC Recalc (°)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>AZI Recalc (°)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {adjustmentData.results.map((result, index) => {
                            const recalcData = recalculatedData?.[index];
                            return (
                              <TableRow key={index} hover>
                                <TableCell>{result.depth.toFixed(2)}</TableCell>
                                <TableCell>{result.adjusted_north.toFixed(3)}</TableCell>
                                <TableCell>{result.adjusted_east.toFixed(3)}</TableCell>
                                <TableCell>{result.adjusted_tvd.toFixed(3)}</TableCell>
                                <TableCell>
                                  {recalcData ? recalcData.inc_recalc.toFixed(2) : '-'}
                                </TableCell>
                                <TableCell>
                                  {recalcData ? recalcData.azi_recalc.toFixed(2) : '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Sub-tab 3: Result Recalculate */}
                {dataSubTab === 2 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Recalculated INC/AZI from Adjusted Path
                    </Typography>
                    {/* {!recalculatedData ? (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Click the "Recalculate INC/AZI" button to calculate INC and AZI from the adjusted wellbore path using gradient calculations.
                      </Alert>
                    ) : (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        INC and AZI have been recalculated from the adjusted wellbore path using gradient calculations (dN/dMD, dE/dMD, dTVD/dMD).
                      </Alert>
                    )} */}
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
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>MD (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffe0b2' }}>North (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffe0b2' }}>East (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#ffe0b2' }}>TVD (m)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>INC Recalc (°)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>AZI Recalc (°)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {recalculatedData ? (
                            recalculatedData.map((data, index) => (
                              <TableRow key={index} hover>
                                <TableCell>{data.md.toFixed(2)}</TableCell>
                                <TableCell>{data.north.toFixed(3)}</TableCell>
                                <TableCell>{data.east.toFixed(3)}</TableCell>
                                <TableCell>{data.tvd.toFixed(3)}</TableCell>
                                <TableCell>{data.inc_recalc.toFixed(2)}</TableCell>
                                <TableCell>{data.azi_recalc.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            adjustmentData.results.map((result, index) => (
                              <TableRow key={index} hover>
                                <TableCell>{result.depth.toFixed(2)}</TableCell>
                                <TableCell>{result.adjusted_north.toFixed(3)}</TableCell>
                                <TableCell>{result.adjusted_east.toFixed(3)}</TableCell>
                                <TableCell>{result.adjusted_tvd.toFixed(3)}</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Box>
            )}

            {/* Tab 2: 3D Graphs */}
            {activeTab === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  3D Wellbore Path
                </Typography>
                <Plot
                  data={[
                    {
                      x: adjustmentData.reference_easting,
                      y: adjustmentData.reference_northing,
                      z: adjustmentData.reference_tvd,
                      mode: 'lines',
                      type: 'scatter3d',
                      name: 'Reference',
                      line: { color: 'blue', width: 4 },
                    },
                    {
                      x: adjustmentData.adjusted_easting,
                      y: adjustmentData.adjusted_northing,
                      z: adjustmentData.adjusted_tvd,
                      mode: 'lines',
                      type: 'scatter3d',
                      name: 'Adjusted',
                      line: { color: 'red', width: 4 },
                    },
                  ]}
                  layout={{
                    scene: {
                      xaxis: { title: 'East [m]' },
                      yaxis: { title: 'North [m]' },
                      zaxis: { title: 'TVD [m]', autorange: 'reversed' },
                      aspectmode: 'cube',
                    },
                    height: 800,
                    showlegend: true,
                    autosize: true,
                    margin: { l: 0, r: 0, t: 40, b: 0 },
                  }}
                  config={{
                    displayModeBar: true,
                    displaylogo: false,
                  }}
                  style={{ width: '100%', height: '100%' }}
                  useResizeHandler
                />
              </Box>
            )}

            {/* Tab 3: Displacement vs MD */}
            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Displacement vs MD
                </Typography>
                <Plot
                  data={[
                    {
                      x: adjustmentData.results.map(r => r.depth),
                      y: adjustmentData.results.map(r => r.delta_total),
                      mode: 'lines+markers',
                      type: 'scatter',
                      name: 'Total Displacement',
                      line: { color: '#1976d2' },
                    },
                    {
                      x: adjustmentData.results.map(r => r.depth),
                      y: adjustmentData.results.map(r => r.delta_horizontal),
                      mode: 'lines',
                      type: 'scatter',
                      name: 'Horizontal Displacement',
                      line: { color: '#ff9800' },
                    },
                  ]}
                  layout={{
                    xaxis: { title: 'MD [m]' },
                    yaxis: { title: 'Displacement [m]' },
                    height: 500,
                    showlegend: true,
                    autosize: true,
                  }}
                  config={{
                    displayModeBar: true,
                    displaylogo: false,
                  }}
                  style={{ width: '100%' }}
                  useResizeHandler
                />
              </Box>
            )}

            {/* Tab 4: Delta North & East vs MD */}
            {activeTab === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Delta North & East vs MD
                </Typography>
                <Plot
                  data={[
                    {
                      x: adjustmentData.results.map(r => r.depth),
                      y: adjustmentData.results.map(r => r.delta_north),
                      mode: 'lines',
                      type: 'scatter',
                      name: 'Delta North',
                      line: { color: '#4caf50' },
                    },
                    {
                      x: adjustmentData.results.map(r => r.depth),
                      y: adjustmentData.results.map(r => r.delta_east),
                      mode: 'lines',
                      type: 'scatter',
                      name: 'Delta East',
                      line: { color: '#f44336' },
                    },
                  ]}
                  layout={{
                    xaxis: { title: 'MD [m]' },
                    yaxis: { title: 'Delta [m]' },
                    height: 500,
                    showlegend: true,
                    autosize: true,
                  }}
                  config={{
                    displayModeBar: true,
                    displaylogo: false,
                  }}
                  style={{ width: '100%' }}
                  useResizeHandler
                />
              </Box>
            )}

            {/* Tab 5: Delta TVD vs MD */}
            {activeTab === 4 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Delta TVD vs MD
                </Typography>
                <Plot
                  data={[
                    {
                      x: adjustmentData.results.map(r => r.depth),
                      y: adjustmentData.results.map(r => r.delta_tvd),
                      mode: 'lines+markers',
                      type: 'scatter',
                      name: 'Delta TVD',
                      line: { color: '#9c27b0' },
                    },
                  ]}
                  layout={{
                    xaxis: { title: 'MD [m]' },
                    yaxis: { title: 'Delta TVD [m]' },
                    height: 500,
                    showlegend: true,
                    autosize: true,
                  }}
                  config={{
                    displayModeBar: true,
                    displaylogo: false,
                  }}
                  style={{ width: '100%' }}
                  useResizeHandler
                />
              </Box>
            )}

            {/* Tab 6: Adjustment Summary */}
            {activeTab === 5 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Adjustment Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Reference File
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {adjustmentData.file1_name}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Comparison File
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {adjustmentData.file2_name}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Points Affected
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {adjustmentData.statistics.points_affected} / {adjustmentData.statistics.total_points}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Max Delta Total
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {adjustmentData.statistics.max_delta_total.toFixed(3)}m
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Additional statistics */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Max Delta North
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {adjustmentData.statistics.max_delta_north.toFixed(3)}m
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Max Delta East
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {adjustmentData.statistics.max_delta_east.toFixed(3)}m
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Max Delta TVD
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {adjustmentData.statistics.max_delta_tvd.toFixed(3)}m
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Max Delta Horizontal
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {adjustmentData.statistics.max_delta_horizontal.toFixed(3)}m
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Avg Delta Horizontal
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {adjustmentData.statistics.avg_delta_horizontal.toFixed(3)}m
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Avg Delta Total
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {adjustmentData.statistics.avg_delta_total.toFixed(3)}m
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Adjustment Parameters */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Adjustment Parameters
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        MD Start
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {adjustmentData.adjustment_params.md_start}m
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        MD End
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {adjustmentData.adjustment_params.md_end}m
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        X Offset (Easting)
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {adjustmentData.adjustment_params.x_offset}m
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Y Offset (Northing)
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {adjustmentData.adjustment_params.y_offset}m
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Z Offset (TVD)
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {adjustmentData.adjustment_params.z_offset}m
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </Paper>
      )}
    </Container>
  );
};
