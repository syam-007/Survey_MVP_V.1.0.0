/**
 * ComparisonDetailPage Component
 *
 * Detailed view of a comparison with comprehensive visualizations.
 * Based on Story 5.4: Comparison Visualization (2D & 3D)
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Button,
  Stack,
  Tab,
  Tabs,
  Alert,
  Chip,
  FormControlLabel,
  Switch,
  Paper,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { ComparisonPlot3D } from '../../components/comparison/ComparisonPlot3D';
import { DeltaVsMDPlot } from '../../components/comparison/DeltaVsMDPlot';
import { AngularComparisonPlot } from '../../components/comparison/AngularComparisonPlot';
import { ComparisonDataTable } from '../../components/comparison/ComparisonDataTable';
import { AdjustmentControls } from '../../components/comparison/AdjustmentControls';
import { useComparison, useExportComparison } from '../../hooks/useComparison';
import type { AdjustmentState } from '../../types/adjustment.types';

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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const ComparisonDetailPage: React.FC = () => {
  const { id: runId, comparisonId } = useParams<{ id: string; comparisonId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tabValue, setTabValue] = useState(0);

  // Check if tab parameter is in URL (for direct navigation to adjustment)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const tabIndex = parseInt(tabParam, 10);
      if (!isNaN(tabIndex)) {
        setTabValue(tabIndex);
      }
    }
  }, [searchParams]);
  const [ratioFactor, setRatioFactor] = useState(10);
  const [showReference, setShowReference] = useState(true);
  const [showPrimary, setShowPrimary] = useState(true);
  const [showDeltas, setShowDeltas] = useState(true);
  const [saveSnackbarOpen, setSaveSnackbarOpen] = useState(false);
  const [adjustmentState, setAdjustmentState] = useState<AdjustmentState | null>(null);

  const { data: comparison, isLoading, error, refetch } = useComparison(comparisonId!);
  const { exportComparison, isExporting } = useExportComparison();

  const handleAdjustmentChange = (newAdjustment: AdjustmentState) => {
    setAdjustmentState(newAdjustment);
  };

  const handleExport = async (format: 'excel' | 'csv') => {
    if (!comparisonId) return;

    try {
      await exportComparison({
        comparisonId,
        format,
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleSave = () => {
    // The comparison data is already saved in the database when created
    // This button confirms the data is saved and shows a notification
    setSaveSnackbarOpen(true);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl">
        <SkeletonLoader variant="detail" />
      </Container>
    );
  }

  if (error || !comparison) {
    return (
      <Container maxWidth="xl">
        <ErrorAlert
          error={error as Error}
          title="Failed to load comparison"
          onRetry={refetch}
        />
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/runs/${runId}/comparison`)}
          sx={{ mt: 2 }}
        >
          Back to Comparison
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <PageHeader
        title="Comparison Details"
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Runs', path: '/runs' },
          { label: comparison.run_info.run_name, path: `/runs/${runId}` },
          { label: 'Comparison', path: `/runs/${runId}/comparison` },
          { label: 'Details' },
        ]}
        actions={
          <Box display="flex" gap={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/runs/${runId}/comparison`)}
            >
              Back
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('excel')}
              disabled={isExporting}
            >
              Export Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('csv')}
              disabled={isExporting}
            >
              Export CSV
            </Button>
          </Box>
        }
      />

      <Stack spacing={3}>
        {/* Comparison Info Card */}
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Comparison Information</Typography>
              <Box display="flex" gap={1}>
                <Chip
                  label={`${comparison.statistics.point_count} points`}
                  color="primary"
                  size="small"
                />
                <Chip
                  label={`Ratio: ${comparison.ratio_factor}`}
                  color="secondary"
                  size="small"
                />
                <Chip
                  label={`Max Deviation: ${comparison.statistics.max_delta_total.toFixed(2)}m`}
                  color="error"
                  size="small"
                />
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <Box flex={1}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.50' }}>
                  <Typography variant="subtitle2" color="primary.main" gutterBottom>
                    Primary Survey
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" gutterBottom>
                    {comparison.primary_survey_info.file_name}
                  </Typography>
                  <Chip
                    label={comparison.primary_survey_info.survey_type}
                    size="small"
                    color="primary"
                  />
                </Paper>
              </Box>

              <Box flex={1}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'secondary.50' }}>
                  <Typography variant="subtitle2" color="secondary.main" gutterBottom>
                    Reference Survey
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" gutterBottom>
                    {comparison.reference_survey_info.file_name}
                  </Typography>
                  <Chip
                    label={comparison.reference_survey_info.survey_type}
                    size="small"
                    color="secondary"
                  />
                </Paper>
              </Box>

              <Box flex={1}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Created
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {format(new Date(comparison.created_at), 'MMM dd, yyyy hh:mm a')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    By: {comparison.created_by_username}
                  </Typography>
                </Paper>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Visualization Controls */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Visualization Controls
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControlLabel
                control={
                  <Switch
                    checked={showReference}
                    onChange={(e) => setShowReference(e.target.checked)}
                  />
                }
                label="Show Reference"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showPrimary}
                    onChange={(e) => setShowPrimary(e.target.checked)}
                  />
                }
                label="Show Primary"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showDeltas}
                    onChange={(e) => setShowDeltas(e.target.checked)}
                  />
                }
                label="Show Delta Vectors"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Visualization Tabs */}
        <Card>
          <CardContent>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="comparison visualization tabs">
                <Tab label="3D Visualization" />
                <Tab label="Curve Adjustment" />
                <Tab label="Position Deltas" />
                <Tab label="Angular Deltas" />
                <Tab label="Data Table" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <ComparisonPlot3D
                comparison={comparison}
                ratioFactor={ratioFactor}
                showReference={showReference}
                showPrimary={showPrimary}
                showDeltas={showDeltas}
                adjustmentState={adjustmentState}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
                <Box flex={1}>
                  <AdjustmentControls
                    comparison={comparison}
                    onAdjustmentChange={handleAdjustmentChange}
                  />
                </Box>
                <Box flex={2}>
                  <ComparisonPlot3D
                    comparison={comparison}
                    ratioFactor={ratioFactor}
                    showReference={showReference}
                    showPrimary={showPrimary}
                    showDeltas={false}
                    adjustmentState={adjustmentState}
                  />
                </Box>
              </Stack>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <DeltaVsMDPlot comparison={comparison} />
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <AngularComparisonPlot comparison={comparison} />
            </TabPanel>

            <TabPanel value={tabValue} index={4}>
              <ComparisonDataTable
                comparison={comparison}
                onExport={(format) => handleExport(format)}
                onSave={handleSave}
              />
            </TabPanel>
          </CardContent>
        </Card>

        {/* Statistics Summary */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Statistical Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'error.50', flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Max Total Deviation
                </Typography>
                <Typography variant="h4" color="error">
                  {comparison.statistics.max_delta_total.toFixed(3)}m
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  at MD: {comparison.statistics.md_at_max_total.toFixed(1)}m
                </Typography>
              </Paper>

              <Paper elevation={0} sx={{ p: 2, bgcolor: 'warning.50', flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Max Horizontal Deviation
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {comparison.statistics.max_delta_horizontal.toFixed(3)}m
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  at MD: {comparison.statistics.md_at_max_horizontal.toFixed(1)}m
                </Typography>
              </Paper>

              <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.50', flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Average Total Deviation
                </Typography>
                <Typography variant="h4" color="info.main">
                  {comparison.statistics.avg_delta_total.toFixed(3)}m
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Std Dev: {comparison.statistics.std_delta_total.toFixed(3)}m
                </Typography>
              </Paper>

              <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.50', flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Comparison Points
                </Typography>
                <Typography variant="h4" color="success.main">
                  {comparison.statistics.point_count}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  MD Range: {comparison.md_data[0].toFixed(0)}m -{' '}
                  {comparison.md_data[comparison.md_data.length - 1].toFixed(0)}m
                </Typography>
              </Paper>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Save Confirmation Snackbar */}
      <Snackbar
        open={saveSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSaveSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSaveSnackbarOpen(false)}
          severity="success"
          sx={{ width: '100%' }}
          variant="filled"
        >
          Comparison data is saved in the database! (ID: {comparison?.id?.toString().slice(0, 8)}..., {comparison?.md_data.length} data points)
        </Alert>
      </Snackbar>
    </Container>
  );
};
