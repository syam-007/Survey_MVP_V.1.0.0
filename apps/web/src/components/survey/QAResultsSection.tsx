/**
 * QA Results Section Component
 *
 * Displays GTL survey quality assurance results in the Survey Results page.
 * Shows summary statistics and detailed station-by-station QA status.
 */
import React from 'react';
import qaService from '../../services/qaService';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
  Alert,
  Button,
  CircularProgress,
  Checkbox,
  Toolbar,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Undo as UndoIcon,
  DeleteSweep as DeleteSweepIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

interface QAStation {
  index: number;
  md: number;
  inc: number;
  azi: number;
  g_t: number;
  w_t: number;
  g_t_difference: number;
  w_t_difference: number;
  g_t_status: 'high' | 'good' | 'low' | 'n/c';
  w_t_status: 'high' | 'good' | 'low' | 'n/c';
  overall_status: 'PASS' | 'REMOVE';
}

interface QASummary {
  total_stations: number;
  pass_count: number;
  remove_count: number;
  g_t_score: string;
  w_t_score: string;
  g_t_percentage: number;
  w_t_percentage: number;
  location_g_t: number;
  location_w_t: number;
  delta_wt_score?: number;
  delta_wt_percentage?: number;
  delta_gt_score?: number;
  delta_gt_percentage?: number;
  w_t_score_points?: number;
  g_t_score_points?: number;
  max_score?: number;
  total_rows?: number;
}

interface QAData {
  qa_id: string;
  file_name: string;
  summary: QASummary;
  stations: QAStation[];
}

interface QAResultsSectionProps {
  qaData: QAData;
  onApprove?: (indicesToKeep?: number[]) => void;
  isApproved?: boolean;
  isApproving?: boolean;
}

export const QAResultsSection: React.FC<QAResultsSectionProps> = ({
  qaData,
  onApprove,
  isApproved = false,
  isApproving = false
}) => {
  const [expanded, setExpanded] = React.useState(true);
  const [deletedStationIndices, setDeletedStationIndices] = React.useState<Set<number>>(new Set());
  const [selectedStations, setSelectedStations] = React.useState<Set<number>>(new Set());
  const [isDownloadingReport, setIsDownloadingReport] = React.useState(false);

  // Extract stations early for use in handlers
  const stations = qaData?.stations || [];

  // Debug logging
  React.useEffect(() => {
    console.log('QAResultsSection - qaData:', qaData);
    console.log('QAResultsSection - summary:', qaData?.summary);
    console.log('QAResultsSection - stations count:', qaData?.stations?.length);
  }, [qaData]);

  // Handle station deletion
  const handleDeleteStation = (index: number) => {
    setDeletedStationIndices(prev => {
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });
  };

  // Handle undo deletion
  const handleUndoDelete = (index: number) => {
    setDeletedStationIndices(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  // Handle select/deselect station
  const handleSelectStation = (index: number) => {
    setSelectedStations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Handle select all stations
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      // Select all non-deleted stations
      const allIndices = new Set(
        stations
          .filter((_, idx) => !deletedStationIndices.has(idx))
          .map(station => station.index)
      );
      setSelectedStations(allIndices);
    } else {
      setSelectedStations(new Set());
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    setDeletedStationIndices(prev => {
      const newSet = new Set(prev);
      selectedStations.forEach(index => newSet.add(index));
      return newSet;
    });
    setSelectedStations(new Set()); // Clear selection after delete
  };

  // Check if all non-deleted stations are selected
  const isAllSelected = stations
    .filter((_, idx) => !deletedStationIndices.has(idx))
    .every(station => selectedStations.has(station.index));

  const isSomeSelected = selectedStations.size > 0 && !isAllSelected;

  // Calculate scores based on non-deleted stations
  const recalculateScores = React.useMemo(() => {
    if (!qaData || !qaData.stations || qaData.stations.length === 0) {
      return null;
    }

    // Filter out deleted stations
    const activeStations = qaData.stations.filter((_, index) => !deletedStationIndices.has(index));

    if (activeStations.length === 0) {
      return {
        pass_count: 0,
        remove_count: 0,
        delta_wt_score: 0,
        delta_wt_percentage: 0,
        delta_gt_score: 0,
        delta_gt_percentage: 0,
        w_t_score_points: 0,
        g_t_score_points: 0,
        max_score: 0,
        total_rows: 0,
      };
    }

    const total_rows = activeStations.length;
    const max_score = total_rows * 1.5;

    // Calculate W(t) and G(t) scores
    let w_t_score_points = 0;
    let g_t_score_points = 0;
    let pass_count = 0;
    let remove_count = 0;

    activeStations.forEach(station => {
      // W(t) points
      if (station.w_t_status === 'high') w_t_score_points += 1.5;
      else if (station.w_t_status === 'good') w_t_score_points += 1.2;
      else if (station.w_t_status === 'low') w_t_score_points += 1.0;

      // G(t) points
      if (station.g_t_status === 'high') g_t_score_points += 1.5;
      else if (station.g_t_status === 'good') g_t_score_points += 1.2;
      else if (station.g_t_status === 'low') g_t_score_points += 1.0;

      // Count pass/remove
      if (station.overall_status === 'PASS') pass_count++;
      else remove_count++;
    });

    const delta_wt_score = w_t_score_points / max_score;
    const delta_gt_score = g_t_score_points / max_score;

    return {
      pass_count,
      remove_count,
      delta_wt_score,
      delta_wt_percentage: delta_wt_score * 100,
      delta_gt_score,
      delta_gt_percentage: delta_gt_score * 100,
      w_t_score_points,
      g_t_score_points,
      max_score,
      total_rows,
    };
  }, [qaData, deletedStationIndices]);

  // Use recalculated scores if there are deletions, otherwise use original
  const displaySummary = React.useMemo(() => {
    if (!qaData?.summary) return null;

    if (deletedStationIndices.size === 0) {
      return qaData.summary;
    }

    // Merge original summary with recalculated scores
    return {
      ...qaData.summary,
      ...recalculateScores,
      total_stations: qaData.stations.length - deletedStationIndices.size,
    };
  }, [qaData, deletedStationIndices, recalculateScores]);

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'high':
        return 'success';
      case 'good':
        return 'warning';
      case 'low':
        return 'error';
      case 'n/c':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'high':
        return <CheckCircleIcon fontSize="small" />;
      case 'good':
        return <CheckCircleIcon fontSize="small" />;
      case 'low':
        return <WarningIcon fontSize="small" />;
      case 'n/c':
        return <ErrorIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const summary = displaySummary;

  // Defensive check
  if (!summary || !stations || stations.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Alert severity="error">
          QA data is incomplete or missing. Please contact support.
        </Alert>
      </Paper>
    );
  }

  // Handle approve with deleted stations
  const handleApproveWithDeletions = () => {
    if (onApprove) {
      // Get indices of stations to keep (non-deleted)
      const indicesToKeep = stations
        .map((_, index) => index)
        .filter(index => !deletedStationIndices.has(index));

      // Pass indices to parent component
      onApprove(indicesToKeep);
    }
  };

  // Handle download QA report
  const handleDownloadReport = async () => {
    setIsDownloadingReport(true);
    try {
      console.log('Downloading QA report for QA ID:', qaData.qa_id);

      // Call the API to download the report
      const blob = await qaService.downloadQAReport(qaData.qa_id);

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `QA_Report_${qaData.file_name}.pdf`);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download QA report:', error);
      alert('Failed to download QA report. The backend endpoint may not be ready yet. Please try again later.');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Quality Assurance (GTL Survey)
        </Typography>
        <IconButton
          onClick={() => setExpanded(!expanded)}
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s',
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Total Stations
              </Typography>
              <Typography variant="h4">{summary.total_stations}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                PASS Stations
              </Typography>
              <Typography variant="h4" color="success.dark">
                {summary.pass_count}
              </Typography>
              <Typography variant="caption">
                {((summary.pass_count / summary.total_stations) * 100).toFixed(1)}% of total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'error.light' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                REMOVE Stations
              </Typography>
              <Typography variant="h4" color="error.dark">
                {summary.remove_count}
              </Typography>
              <Typography variant="caption">
                {((summary.remove_count / summary.total_stations) * 100).toFixed(1)}% of total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Overall Quality
              </Typography>
              <Box display="flex" gap={1} alignItems="center">
                <Chip
                  label={`G(t): ${summary.g_t_percentage.toFixed(1)}%`}
                  color={summary.g_t_percentage >= 80 ? 'success' : 'warning'}
                  size="small"
                />
                <Chip
                  label={`W(t): ${summary.w_t_percentage.toFixed(1)}%`}
                  color={summary.w_t_percentage >= 80 ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid> */}

        {/* Delta W(t) Score Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'info.50' }}>
            <CardContent>
              <Typography variant="subtitle2" color="info.dark" gutterBottom>
                Delta W(t) Score
              </Typography>
              {summary.delta_wt_score !== undefined ? (
                <>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h5" color="info.main">
                      {summary.w_t_score_points?.toFixed(2)} / {summary.max_score?.toFixed(2)}
                    </Typography>
                    <Chip
                      label={`${summary.delta_wt_percentage?.toFixed(2)}%`}
                      color={summary.delta_wt_percentage! >= 80 ? 'success' : summary.delta_wt_percentage! >= 60 ? 'warning' : 'error'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Score: {summary.delta_wt_score?.toFixed(4)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Location W(t): {summary.location_w_t.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Points: High=1.5, Good=1.2, Low=1.0, N/C=0
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Calculating...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Delta G(t) Score Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'secondary.50' }}>
            <CardContent>
              <Typography variant="subtitle2" color="secondary.dark" gutterBottom>
                Delta G(t) Score
              </Typography>
              {summary.delta_gt_score !== undefined ? (
                <>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h5" color="secondary.main">
                      {summary.g_t_score_points?.toFixed(2)} / {summary.max_score?.toFixed(2)}
                    </Typography>
                    <Chip
                      label={`${summary.delta_gt_percentage?.toFixed(2)}%`}
                      color={summary.delta_gt_percentage! >= 80 ? 'success' : summary.delta_gt_percentage! >= 60 ? 'warning' : 'error'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Score: {summary.delta_gt_score?.toFixed(4)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Location G(t): {summary.location_g_t.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Points: High=1.5, Good=1.2, Low=1.0, N/C=0
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Calculating...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert Message */}
      <Alert severity={isApproved ? 'success' : 'info'} sx={{ mb: 2 }}>
        {isApproved
          ? '✓ This QA is verified and approved. Survey calculation is complete. You can view the survey details in the Survey Detail tab.'
          : 'This survey has been quality assured. Review the results and click "Approve & Calculate" to proceed with survey calculation.'}
      </Alert>

      {/* Download Report Button - Only visible when QA is approved */}
      {isApproved && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleDownloadReport}
            disabled={isDownloadingReport}
            startIcon={isDownloadingReport ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            sx={{
              minWidth: 200,
              py: 1.5,
              fontSize: '1rem',
            }}
          >
            {isDownloadingReport ? 'Generating Report...' : 'Download QA Report'}
          </Button>
        </Box>
      )}

      {/* Alert for deleted stations */}
      {deletedStationIndices.size > 0 && !isApproved && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {deletedStationIndices.size} station(s) marked for deletion. These will be excluded when you approve the survey.
        </Alert>
      )}

      {/* Approve Button */}
      {!isApproved && onApprove && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={handleApproveWithDeletions}
            disabled={isApproving}
            startIcon={isApproving ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
            sx={{
              minWidth: 200,
              py: 1.5,
              fontSize: '1.1rem',
            }}
          >
            {isApproving ? 'Approving & Calculating...' : 'Approve & Calculate Survey'}
          </Button>
        </Box>
      )}

      {/* Detailed Station Table (Collapsible) */}
      <Collapse in={expanded}>
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
          Station-by-Station QA Results
        </Typography>

        {/* Bulk Actions Toolbar */}
        {!isApproved && selectedStations.size > 0 && (
          <Toolbar
            sx={{
              pl: { sm: 2 },
              pr: { xs: 1, sm: 1 },
              bgcolor: 'primary.50',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <Typography
              sx={{ flex: '1 1 100%' }}
              color="inherit"
              variant="subtitle1"
              component="div"
            >
              {selectedStations.size} station{selectedStations.size > 1 ? 's' : ''} selected
            </Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={handleBulkDelete}
              size="small"
            >
              Delete Selected
            </Button>
          </Toolbar>
        )}

        <TableContainer component={Paper} variant="outlined">
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {!isApproved && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={isSomeSelected}
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      disabled={stations.filter((_, idx) => !deletedStationIndices.has(idx)).length === 0}
                    />
                  </TableCell>
                )}
                <TableCell>Station</TableCell>
                <TableCell>MD</TableCell>
                <TableCell>INC</TableCell>
                <TableCell>AZI</TableCell>
                <TableCell>G(t)</TableCell>
                <TableCell>G(t) Diff</TableCell>
                <TableCell>G(t) Status</TableCell>
                <TableCell>W(t)</TableCell>
                <TableCell>W(t) Diff</TableCell>
                <TableCell>W(t) Status</TableCell>
                <TableCell>Overall</TableCell>
                {!isApproved && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {stations.map((station, stationNumber) => {
                const isDeleted = deletedStationIndices.has(station.index);
                const isSelected = selectedStations.has(station.index);
                return (
                  <TableRow
                    key={station.index}
                    sx={{
                      opacity: isDeleted ? 0.4 : 1,
                      textDecoration: isDeleted ? 'line-through' : 'none',
                      bgcolor: isDeleted ? 'error.50' : isSelected ? 'primary.50' : 'inherit',
                    }}
                  >
                    {!isApproved && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectStation(station.index)}
                          disabled={isDeleted}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {stationNumber + 1}
                      </Typography>
                    </TableCell>
                    <TableCell>{station.md.toFixed(2)}</TableCell>
                    <TableCell>{station.inc.toFixed(2)}</TableCell>
                    <TableCell>{station.azi.toFixed(2)}</TableCell>
                    <TableCell>{station.g_t.toFixed(2)}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={Math.abs(station.g_t_difference) <= 1 ? 'success.main' : 'error.main'}
                      >
                        {station.g_t_difference > 0 ? '+' : ''}
                        {station.g_t_difference.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={station.g_t_status}
                        color={getStatusColor(station.g_t_status)}
                        icon={getStatusIcon(station.g_t_status)}
                      />
                    </TableCell>
                    <TableCell>{station.w_t.toFixed(2)}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={Math.abs(station.w_t_difference) <= 1 ? 'success.main' : 'error.main'}
                      >
                        {station.w_t_difference > 0 ? '+' : ''}
                        {station.w_t_difference.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={station.w_t_status}
                        color={getStatusColor(station.w_t_status)}
                        icon={getStatusIcon(station.w_t_status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={station.overall_status}
                        color={station.overall_status === 'PASS' ? 'success' : 'error'}
                      />
                    </TableCell>
                    {!isApproved && (
                      <TableCell align="center">
                        {isDeleted ? (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleUndoDelete(station.index)}
                            title="Undo deletion"
                          >
                            <UndoIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteStation(station.index)}
                            title="Delete station"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Paper>
  );
};
