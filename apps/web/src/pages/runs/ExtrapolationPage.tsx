/**
 * ExtrapolationPage
 *
 * Displays extrapolated survey data with visualizations and data tables.
 * Shows original, interpolated, and extrapolated survey points.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  Breadcrumbs,
  Link,
  Divider,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButtonGroup,
  ToggleButton,
  Snackbar,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import type { PlotType, SurveyPlotData } from '../../components/visualization/types';
import extrapolationService, { type ExtrapolationData } from '../../services/extrapolationService';
import { ExtrapolationPlot2D } from '../../components/survey/ExtrapolationPlot2D';
import { ExtrapolationPlot3D } from '../../components/survey/ExtrapolationPlot3D';

export const ExtrapolationPage: React.FC = () => {
  const { runId, extrapolationId } = useParams<{ runId: string; extrapolationId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const surveyId = searchParams.get('surveyId');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [extrapolationData, setExtrapolationData] = useState<any | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [plotType2D, setPlotType2D] = useState<PlotType>('vertical');
  const [dataView, setDataView] = useState<'original' | 'extrapolated' | 'combined'>('combined');

  // Adjustment parameters state
  const [extrapolationLength, setExtrapolationLength] = useState<number>(200);
  const [extrapolationStep, setExtrapolationStep] = useState<number>(10);
  const [interpolationStep, setInterpolationStep] = useState<number>(10);
  const [extrapolationMethod, setExtrapolationMethod] = useState<string>('Constant');

  // Load existing extrapolation or calculate with default settings
  useEffect(() => {
    const loadOrCalculate = async () => {
      // Mode 1: View existing extrapolation by ID (but not if it's "new")
      if (extrapolationId && extrapolationId !== 'new') {
        try {
          setIsLoading(true);
          setError(null);

          const data = await extrapolationService.getExtrapolation(extrapolationId);
          setExtrapolationData(data);
          setIsSaved(true); // Already saved in database

          // Set parameters from loaded data for adjustment
          setExtrapolationLength(data.extrapolation_length);
          setExtrapolationStep(data.extrapolation_step);
          setInterpolationStep(data.interpolation_step);
          setExtrapolationMethod(data.extrapolation_method);
        } catch (err: any) {
          console.error('Failed to load extrapolation:', err);
          setError(err.response?.data?.error || err.message || 'Failed to load extrapolation');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Mode 2: Calculate with default settings for new extrapolation
      if (surveyId && runId) {
        try {
          setIsLoading(true);
          setError(null);

          // Calculate with default parameters
          const data = await extrapolationService.calculateExtrapolation({
            survey_data_id: surveyId,
            run_id: runId,
            extrapolation_length: extrapolationLength,
            extrapolation_step: extrapolationStep,
            interpolation_step: interpolationStep,
            extrapolation_method: extrapolationMethod as 'Constant' | 'Linear Trend' | 'Curve Fit',
          });

          setExtrapolationData(data);
          setIsSaved(false); // Not saved yet
        } catch (err: any) {
          console.error('Extrapolation error:', err);
          const errorDetails = err.response?.data?.details;
          let errorMessage = 'Failed to calculate extrapolation';

          if (errorDetails) {
            const errors = Object.entries(errorDetails)
              .map(([field, messages]: [string, any]) => {
                const msgArray = Array.isArray(messages) ? messages : [messages];
                return `${field}: ${msgArray.join(', ')}`;
              })
              .join('; ');
            errorMessage = `Validation error: ${errors}`;
          } else if (err.response?.data?.error) {
            errorMessage = err.response.data.error;
          } else if (err.message) {
            errorMessage = err.message;
          }

          setError(errorMessage);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // No valid mode
      setError('Missing survey ID or run ID');
      setIsLoading(false);
    };

    loadOrCalculate();
  }, [extrapolationId, surveyId, runId]);

  const handleRecalculate = async () => {
    // Use surveyId from query params or extract from existing data
    const dataId = surveyId || extrapolationData?.survey_data_id;
    const runIdToUse = runId || extrapolationData?.run_id;

    if (!dataId || !runIdToUse) return;

    try {
      setIsCalculating(true);
      setError(null);

      const data = await extrapolationService.calculateExtrapolation({
        survey_data_id: dataId,
        run_id: runIdToUse,
        extrapolation_length: extrapolationLength,
        extrapolation_step: extrapolationStep,
        interpolation_step: interpolationStep,
        extrapolation_method: extrapolationMethod as 'Constant' | 'Linear Trend' | 'Curve Fit',
      });

      setExtrapolationData(data);
      setIsSaved(false); // Recalculated data is not saved
    } catch (err: any) {
      console.error('Extrapolation error:', err);
      const errorDetails = err.response?.data?.details;
      let errorMessage = 'Failed to recalculate extrapolation';

      if (errorDetails) {
        const errors = Object.entries(errorDetails)
          .map(([field, messages]: [string, any]) => {
            const msgArray = Array.isArray(messages) ? messages : [messages];
            return `${field}: ${msgArray.join(', ')}`;
          })
          .join('; ');
        errorMessage = `Validation error: ${errors}`;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveData = async () => {
    if (!extrapolationData || isSaved) return;

    try {
      setIsSaving(true);
      setError(null);

      await extrapolationService.createExtrapolation({
        survey_data_id: extrapolationData.survey_data_id,
        run_id: extrapolationData.run_id,
        extrapolation_length: extrapolationData.extrapolation_length,
        extrapolation_step: extrapolationData.extrapolation_step,
        interpolation_step: extrapolationData.interpolation_step,
        extrapolation_method: extrapolationData.extrapolation_method,
      });

      setIsSaved(true);
      setSaveSuccess(true);

      // Hide success notification after 5 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error('Failed to save extrapolation:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save extrapolation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!extrapolationData) return;

    // Prepare CSV data
    const headers = ['MD', 'INC', 'AZI', 'Northing', 'Easting', 'TVD', 'Type'];
    const rows: string[][] = [headers];

    // Add original points
    for (let i = 0; i < extrapolationData.original_md.length; i++) {
      rows.push([
        extrapolationData.original_md[i].toFixed(2),
        extrapolationData.original_inc[i].toFixed(2),
        extrapolationData.original_azi[i].toFixed(2),
        extrapolationData.original_north[i].toFixed(2),
        extrapolationData.original_east[i].toFixed(2),
        extrapolationData.original_tvd[i].toFixed(2),
        'Original',
      ]);
    }

    // Add interpolated points
    for (let i = 0; i < extrapolationData.interpolated_md.length; i++) {
      rows.push([
        extrapolationData.interpolated_md[i].toFixed(2),
        extrapolationData.interpolated_inc[i].toFixed(2),
        extrapolationData.interpolated_azi[i].toFixed(2),
        extrapolationData.interpolated_north[i].toFixed(2),
        extrapolationData.interpolated_east[i].toFixed(2),
        extrapolationData.interpolated_tvd[i].toFixed(2),
        'Interpolated',
      ]);
    }

    // Add extrapolated points
    for (let i = 0; i < extrapolationData.extrapolated_md.length; i++) {
      rows.push([
        extrapolationData.extrapolated_md[i].toFixed(2),
        extrapolationData.extrapolated_inc[i].toFixed(2),
        extrapolationData.extrapolated_azi[i].toFixed(2),
        extrapolationData.extrapolated_north[i].toFixed(2),
        extrapolationData.extrapolated_east[i].toFixed(2),
        extrapolationData.extrapolated_tvd[i].toFixed(2),
        'Extrapolated',
      ]);
    }

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extrapolation_${extrapolationData.id}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getCurrentViewData = () => {
    if (!extrapolationData) return null;

    switch (dataView) {
      case 'original':
        return {
          md: extrapolationData.original_md,
          inc: extrapolationData.original_inc,
          azi: extrapolationData.original_azi,
          north: extrapolationData.original_north,
          east: extrapolationData.original_east,
          tvd: extrapolationData.original_tvd,
        };
      case 'extrapolated':
        return {
          md: extrapolationData.extrapolated_md,
          inc: extrapolationData.extrapolated_inc,
          azi: extrapolationData.extrapolated_azi,
          north: extrapolationData.extrapolated_north,
          east: extrapolationData.extrapolated_east,
          tvd: extrapolationData.extrapolated_tvd,
        };
      case 'combined':
      default:
        return {
          md: extrapolationData.combined_md,
          inc: extrapolationData.combined_inc,
          azi: extrapolationData.combined_azi,
          north: extrapolationData.combined_north,
          east: extrapolationData.combined_east,
          tvd: extrapolationData.combined_tvd,
        };
    }
  };

  // Convert extrapolation data to SurveyPlotData format for visualization
  const getSurveyPlotData = (): SurveyPlotData | null => {
    const viewData = getCurrentViewData();
    if (!viewData) return null;

    return {
      md: viewData.md,
      inc: viewData.inc,
      azi: viewData.azi,
      easting: viewData.east,
      northing: viewData.north,
      tvd: viewData.tvd,
      pointCount: viewData.md.length,
    };
  };

  if (!runId) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">Invalid run ID</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ px: 3, py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('/runs');
          }}
        >
          Runs
        </Link>
        <Link
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate(`/runs/${runId}`);
          }}
        >
          Run Details
        </Link>
        <Typography color="text.primary">Extrapolation Results</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Extrapolation Results
          {!isSaved && extrapolationData && (
            <Chip
              label="Not Saved"
              color="warning"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
          {isSaved && (
            <Chip
              label="Saved"
              color="success"
              size="small"
              sx={{ ml: 2 }}
              icon={<CheckCircleIcon />}
            />
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/runs/${runId}`)}
          >
            Back to Run
          </Button>
          {extrapolationData && !isSaved && (
            <Button
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              onClick={handleSaveData}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Data'}
            </Button>
          )}
          {extrapolationData && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadCSV}
            >
              Download CSV
            </Button>
          )}
        </Box>
      </Box>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {!isLoading && !error && extrapolationData && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Original Points
                  </Typography>
                  <Typography variant="h4">{extrapolationData.original_point_count}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Initial MD
                  </Typography>
                  <Typography variant="h4">{extrapolationData.original_md[0].toFixed(2)}m</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Extrapolated Points
                  </Typography>
                  <Typography variant="h4">{extrapolationData.extrapolated_point_count}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Final MD
                  </Typography>
                  <Typography variant="h4">{extrapolationData.final_md.toFixed(2)}m</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Adjust Extrapolation Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Adjust Extrapolation Settings
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleRecalculate}
                disabled={isCalculating}
              >
                {isCalculating ? 'Recalculating...' : 'Recalculate'}
              </Button>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Extrapolation Length (m)"
                  type="number"
                  value={extrapolationLength}
                  onChange={(e) => setExtrapolationLength(Number(e.target.value))}
                  inputProps={{ min: 0.1, max: 10000, step: 50 }}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Extrapolation Step (m)"
                  type="number"
                  value={extrapolationStep}
                  onChange={(e) => setExtrapolationStep(Number(e.target.value))}
                  inputProps={{ min: 1, max: 50, step: 1 }}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Interpolation Step (m)"
                  type="number"
                  value={interpolationStep}
                  onChange={(e) => setInterpolationStep(Number(e.target.value))}
                  inputProps={{ min: 1, max: 50, step: 1 }}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Method</InputLabel>
                  <Select
                    value={extrapolationMethod}
                    onChange={(e) => setExtrapolationMethod(e.target.value)}
                    label="Method"
                  >
                    <MenuItem value="Constant">Constant</MenuItem>
                    <MenuItem value="Linear Trend">Linear Trend</MenuItem>
                    <MenuItem value="Curve Fit">Curve Fit</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Data View Toggle */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Data View
            </Typography>
            <ToggleButtonGroup
              value={dataView}
              exclusive
              onChange={(_, newValue) => {
                if (newValue !== null) {
                  setDataView(newValue);
                }
              }}
              aria-label="data view"
            >
              <ToggleButton value="original" aria-label="original data">
                Original
              </ToggleButton>
              <ToggleButton value="extrapolated" aria-label="extrapolated data">
                Extrapolated
              </ToggleButton>
              <ToggleButton value="combined" aria-label="combined data">
                Combined
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>

          {/* Data Table */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Survey Data ({dataView})
            </Typography>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>MD (m)</TableCell>
                    <TableCell>INC (°)</TableCell>
                    <TableCell>AZI (°)</TableCell>
                    <TableCell>Northing (m)</TableCell>
                    <TableCell>Easting (m)</TableCell>
                    <TableCell>TVD (m)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const viewData = getCurrentViewData();
                    if (!viewData) return null;

                    return viewData.md.map((md, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{md.toFixed(2)}</TableCell>
                        <TableCell>{viewData.inc[index].toFixed(2)}</TableCell>
                        <TableCell>{viewData.azi[index].toFixed(2)}</TableCell>
                        <TableCell>{viewData.north[index].toFixed(2)}</TableCell>
                        <TableCell>{viewData.east[index].toFixed(2)}</TableCell>
                        <TableCell>{viewData.tvd[index].toFixed(2)}</TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Visualizations - Side by Side */}
          <Grid container spacing={3}>
            {/* 3D Visualization */}
            <Grid item xs={12} lg={6}>
              <Paper sx={{ p: 3, height: '100%', minHeight: 750 }}>
                <Typography variant="h6" gutterBottom>
                  3D Well Path Visualization
                  <Typography variant="caption" display="block" color="text.secondary">
                    Blue: Original | Red: Extrapolated
                  </Typography>
                </Typography>
                <Box sx={{ height: 700, width: '100%' }}>
                  {extrapolationData && (
                    <ExtrapolationPlot3D
                      originalData={{
                        easting: extrapolationData.original_east,
                        northing: extrapolationData.original_north,
                        tvd: extrapolationData.original_tvd,
                      }}
                      extrapolatedData={{
                        easting: extrapolationData.extrapolated_east,
                        northing: extrapolationData.extrapolated_north,
                        tvd: extrapolationData.extrapolated_tvd,
                      }}
                    />
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* 2D Visualization */}
            <Grid item xs={12} lg={6}>
              <Paper sx={{ p: 3, height: '100%', minHeight: 750 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="h6">
                      2D Survey Plots
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Blue: Original | Red: Extrapolated
                    </Typography>
                  </Box>
                  <ToggleButtonGroup
                    value={plotType2D}
                    exclusive
                    onChange={(_, newValue) => {
                      if (newValue !== null) {
                        setPlotType2D(newValue);
                      }
                    }}
                    size="small"
                  >
                    <ToggleButton value="vertical" aria-label="vertical section">
                      Vertical
                    </ToggleButton>
                    <ToggleButton value="plan" aria-label="plan view">
                      Plan
                    </ToggleButton>
                    <ToggleButton value="inclination" aria-label="inclination">
                      Inclination
                    </ToggleButton>
                    <ToggleButton value="azimuth" aria-label="azimuth">
                      Azimuth
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <Box sx={{ height: 700, width: '100%' }}>
                  {extrapolationData && (
                    <ExtrapolationPlot2D
                      originalData={{
                        md: extrapolationData.original_md,
                        inc: extrapolationData.original_inc,
                        azi: extrapolationData.original_azi,
                        easting: extrapolationData.original_east,
                        northing: extrapolationData.original_north,
                        tvd: extrapolationData.original_tvd,
                      }}
                      extrapolatedData={{
                        md: extrapolationData.extrapolated_md,
                        inc: extrapolationData.extrapolated_inc,
                        azi: extrapolationData.extrapolated_azi,
                        easting: extrapolationData.extrapolated_east,
                        northing: extrapolationData.extrapolated_north,
                        tvd: extrapolationData.extrapolated_tvd,
                      }}
                      plotType={plotType2D}
                    />
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
      </Box>

      {/* Success Notification */}
      <Snackbar
        open={saveSuccess}
        autoHideDuration={5000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSaveSuccess(false)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          Extrapolation data saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};
