/**
 * ComparisonResults Component
 *
 * Displays comparison statistics and delta analysis results.
 */
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Grid,
  Chip,
  Button,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useExportComparison } from '../../hooks/useComparison';
import type { ComparisonResult } from '../../types/comparison.types';
import { DeltaVsMDPlot } from './DeltaVsMDPlot';
import { AngularComparisonPlot } from './AngularComparisonPlot';
import { ComparisonPlot3D } from './ComparisonPlot3D';

interface ComparisonResultsProps {
  comparison: ComparisonResult;
  onNewComparison: () => void;
}

export const ComparisonResults: React.FC<ComparisonResultsProps> = ({
  comparison,
  onNewComparison,
}) => {
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
  const { exportComparison, isExporting, error: exportError } = useExportComparison();

  const stats = comparison.statistics;

  const handleExport = async () => {
    try {
      await exportComparison({
        comparisonId: comparison.id,
        format: exportFormat,
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatNumber = (value: number, decimals: number = 3) => {
    return value.toFixed(decimals);
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <AssessmentIcon color="primary" fontSize="large" />
            <Box>
              <Typography variant="h6">Comparison Results</Typography>
              <Typography variant="caption" color="text.secondary">
                Created {format(new Date(comparison.created_at), 'MMM dd, yyyy hh:mm a')}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onNewComparison}
            >
              New Comparison
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Survey Info */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.50' }}>
              <Typography variant="subtitle2" color="primary.main" gutterBottom>
                Primary Survey
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {comparison.primary_survey_info.file_name}
              </Typography>
              <Box display="flex" gap={1} mt={1}>
                <Chip
                  label={comparison.primary_survey_info.survey_type}
                  size="small"
                  color="primary"
                />
                <Chip
                  label={`${comparison.primary_survey_info.row_count || 0} rows`}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'secondary.50' }}>
              <Typography variant="subtitle2" color="secondary.main" gutterBottom>
                Reference Survey
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {comparison.reference_survey_info.file_name}
              </Typography>
              <Box display="flex" gap={1} mt={1}>
                <Chip
                  label={comparison.reference_survey_info.survey_type}
                  size="small"
                  color="secondary"
                />
                <Chip
                  label={`${comparison.reference_survey_info.row_count || 0} rows`}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Statistics Summary */}
        <Typography variant="h6" gutterBottom>
          Statistical Summary
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {stats.point_count}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Comparison Points
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'error.50', textAlign: 'center' }}>
              <Typography variant="h4" color="error">
                {formatNumber(stats.max_delta_total, 2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Max Total Deviation (m)
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'warning.50', textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {formatNumber(stats.max_delta_horizontal, 2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Max Horizontal Deviation (m)
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.50', textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {formatNumber(stats.avg_delta_total, 2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Avg Total Deviation (m)
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Position Deltas Table */}
        <Typography variant="h6" gutterBottom>
          Position Deltas
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell><strong>Metric</strong></TableCell>
                  <TableCell align="right"><strong>ΔX (m)</strong></TableCell>
                  <TableCell align="right"><strong>ΔY (m)</strong></TableCell>
                  <TableCell align="right"><strong>ΔZ (m)</strong></TableCell>
                  <TableCell align="right"><strong>Horizontal (m)</strong></TableCell>
                  <TableCell align="right"><strong>Total (m)</strong></TableCell>
                </TableRow>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Maximum</TableCell>
                <TableCell align="right">{formatNumber(stats.max_delta_x)}</TableCell>
                <TableCell align="right">{formatNumber(stats.max_delta_y)}</TableCell>
                <TableCell align="right">{formatNumber(stats.max_delta_z)}</TableCell>
                <TableCell align="right">{formatNumber(stats.max_delta_horizontal)}</TableCell>
                <TableCell align="right">{formatNumber(stats.max_delta_total)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Average</TableCell>
                <TableCell align="right">{formatNumber(stats.avg_delta_x)}</TableCell>
                <TableCell align="right">{formatNumber(stats.avg_delta_y)}</TableCell>
                <TableCell align="right">{formatNumber(stats.avg_delta_z)}</TableCell>
                <TableCell align="right">{formatNumber(stats.avg_delta_horizontal)}</TableCell>
                <TableCell align="right">{formatNumber(stats.avg_delta_total)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Std Deviation</TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell align="right">{formatNumber(stats.std_delta_horizontal)}</TableCell>
                <TableCell align="right">{formatNumber(stats.std_delta_total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Angular Deltas Table */}
        <Typography variant="h6" gutterBottom>
          Angular Deltas
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>Metric</strong></TableCell>
                <TableCell align="right"><strong>ΔInclination (°)</strong></TableCell>
                <TableCell align="right"><strong>ΔAzimuth (°)</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Maximum</TableCell>
                <TableCell align="right">{formatNumber(stats.max_delta_inc, 2)}</TableCell>
                <TableCell align="right">{formatNumber(stats.max_delta_azi, 2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Average</TableCell>
                <TableCell align="right">{formatNumber(stats.avg_delta_inc, 2)}</TableCell>
                <TableCell align="right">{formatNumber(stats.avg_delta_azi, 2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Std Deviation</TableCell>
                <TableCell align="right">{formatNumber(stats.std_delta_inc, 2)}</TableCell>
                <TableCell align="right">{formatNumber(stats.std_delta_azi, 2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Deviations at Key Depths */}
        <Typography variant="h6" gutterBottom>
          Deviations at Key Depths
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>Position</strong></TableCell>
                <TableCell align="right"><strong>MD (m)</strong></TableCell>
                <TableCell align="right"><strong>Horizontal (m)</strong></TableCell>
                <TableCell align="right"><strong>Total (m)</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Start</TableCell>
                <TableCell align="right">{formatNumber(stats.deviation_at_start.md)}</TableCell>
                <TableCell align="right">
                  {formatNumber(stats.deviation_at_start.delta_horizontal)}
                </TableCell>
                <TableCell align="right">
                  {formatNumber(stats.deviation_at_start.delta_total)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>25%</TableCell>
                <TableCell align="right">{formatNumber(stats.deviation_at_25_percent.md)}</TableCell>
                <TableCell align="right">
                  {formatNumber(stats.deviation_at_25_percent.delta_horizontal)}
                </TableCell>
                <TableCell align="right">
                  {formatNumber(stats.deviation_at_25_percent.delta_total)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>50%</TableCell>
                <TableCell align="right">{formatNumber(stats.deviation_at_50_percent.md)}</TableCell>
                <TableCell align="right">
                  {formatNumber(stats.deviation_at_50_percent.delta_horizontal)}
                </TableCell>
                <TableCell align="right">
                  {formatNumber(stats.deviation_at_50_percent.delta_total)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>75%</TableCell>
                <TableCell align="right">{formatNumber(stats.deviation_at_75_percent.md)}</TableCell>
                <TableCell align="right">
                  {formatNumber(stats.deviation_at_75_percent.delta_horizontal)}
                </TableCell>
                <TableCell align="right">
                  {formatNumber(stats.deviation_at_75_percent.delta_total)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>End</TableCell>
                <TableCell align="right">{formatNumber(stats.deviation_at_end.md)}</TableCell>
                <TableCell align="right">
                  {formatNumber(stats.deviation_at_end.delta_horizontal)}
                </TableCell>
                <TableCell align="right">
                  {formatNumber(stats.deviation_at_end.delta_total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* 2D Visualizations */}
        <Typography variant="h6" gutterBottom>
          Position Deltas vs Measured Depth
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mb: 3 }}>
          <DeltaVsMDPlot
            mdData={comparison.md_data}
            deltaX={comparison.delta_x}
            deltaY={comparison.delta_y}
            deltaZ={comparison.delta_z}
            deltaHorizontal={comparison.delta_horizontal}
            deltaTotal={comparison.delta_total}
          />
        </Box>

        {/* Angular Deltas */}
        <Typography variant="h6" gutterBottom>
          Angular Deltas vs Measured Depth
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mb: 3 }}>
          <AngularComparisonPlot
            mdData={comparison.md_data}
            deltaInc={comparison.delta_inc}
            deltaAzi={comparison.delta_azi}
          />
        </Box>

        {/* 3D Visualization */}
        <Typography variant="h6" gutterBottom>
          3D Survey Comparison
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mb: 3 }}>
          <ComparisonPlot3D
            comparisonData={comparison}
          />
        </Box>

        {exportError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Export failed: {exportError.message || 'Unknown error'}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
