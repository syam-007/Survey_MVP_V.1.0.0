/**
 * QA Review Page
 *
 * Displays temporary QA results for GTL survey uploads.
 * Allows users to review QA metrics, delete stations, and approve the survey.
 * This page works with temporary QA data (not yet saved to database).
 */
import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { QAResult, QAStation } from '../../services/qaService';
import qaService from '../../services/qaService';

export const QAReviewPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { runId } = useParams<{ runId: string }>();

  // Get QA data from navigation state
  const qaData = location.state?.qaData as QAResult | undefined;

  const [deletedStationIndices, setDeletedStationIndices] = useState<Set<number>>(new Set());
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle delete station
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

  // Recalculate scores based on non-deleted stations
  const recalculatedScores = useMemo(() => {
    if (!qaData || !qaData.stations || qaData.stations.length === 0) {
      return null;
    }

    // Filter out deleted stations
    const activeStations = qaData.stations.filter((_, index) => !deletedStationIndices.has(index));

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

    const delta_wt_score = max_score > 0 ? w_t_score_points / max_score : 0;
    const delta_gt_score = max_score > 0 ? g_t_score_points / max_score : 0;

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

  // Display summary with recalculated scores if there are deletions
  const displaySummary = useMemo(() => {
    if (!qaData?.summary) return null;

    if (deletedStationIndices.size === 0) {
      return qaData.summary;
    }

    // Merge original summary with recalculated scores
    return {
      ...qaData.summary,
      ...recalculatedScores,
      total_stations: qaData.stations.length - deletedStationIndices.size,
    };
  }, [qaData, deletedStationIndices, recalculatedScores]);

  // Handle approve and calculate
  const handleApprove = async () => {
    if (!qaData?.temp_qa_id) {
      setError('No temporary QA ID found');
      return;
    }

    setIsApproving(true);
    setError(null);

    try {
      // Get indices to keep (all stations that aren't deleted)
      const indicesToKeep = qaData.stations
        .map((_, index) => index)
        .filter(index => !deletedStationIndices.has(index));

      const response = await qaService.approveTempQA(qaData.temp_qa_id, indicesToKeep);

      // Navigate to survey results page
      if (response.survey_data_id) {
        navigate(`/runs/${runId}/surveys/${response.survey_data_id}`);
      }
    } catch (err: any) {
      console.error('Error approving QA:', err);
      setError(err.response?.data?.error || 'Failed to approve QA and calculate survey');
    } finally {
      setIsApproving(false);
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'high':
        return 'success';
      case 'good':
        return 'warning';
      case 'low':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPercentageColor = (percentage: number): 'success' | 'warning' | 'error' => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'error';
  };

  if (!qaData) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          No QA data found. Please upload a survey file first.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/runs/${runId}`)}
          sx={{ mt: 2 }}
        >
          Back to Run Detail
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/runs/${runId}`)}
          sx={{ mb: 2 }}
        >
          Back to Run Detail
        </Button>
        <Typography variant="h4" gutterBottom>
          GTL Survey QA Review
        </Typography>
        <Typography variant="body2" color="text.secondary">
          File: {qaData.file_name}
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          Review the QA results below. You can delete stations that fail QA checks. Once you're satisfied, click "Approve & Calculate Survey" to save the data and trigger survey calculation.
        </Alert>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Deleted Stations Warning */}
      {deletedStationIndices.size > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {deletedStationIndices.size} station(s) will be removed. Scores updated based on remaining stations.
        </Alert>
      )}

      {/* Score Cards */}
      {displaySummary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Total Stations */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Stations
                </Typography>
                <Typography variant="h4">
                  {displaySummary.total_stations}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Pass Count */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Pass Count
                </Typography>
                <Typography variant="h4" color="success.main">
                  {displaySummary.pass_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Delta W(t) Score */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Delta W(t) Score
                </Typography>
                <Typography variant="h4">
                  {displaySummary.delta_wt_score?.toFixed(4) || 'N/A'}
                </Typography>
                <Chip
                  label={`${displaySummary.delta_wt_percentage?.toFixed(2) || 0}%`}
                  color={getPercentageColor(displaySummary.delta_wt_percentage || 0)}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Delta G(t) Score */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Delta G(t) Score
                </Typography>
                <Typography variant="h4">
                  {displaySummary.delta_gt_score?.toFixed(4) || 'N/A'}
                </Typography>
                <Chip
                  label={`${displaySummary.delta_gt_percentage?.toFixed(2) || 0}%`}
                  color={getPercentageColor(displaySummary.delta_gt_percentage || 0)}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* QA Data Table */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Station Data</Typography>
        </Box>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Index</TableCell>
                <TableCell align="right">MD</TableCell>
                <TableCell align="right">INC</TableCell>
                <TableCell align="right">AZI</TableCell>
                <TableCell align="right">G(T)</TableCell>
                <TableCell align="right">W(T)</TableCell>
                <TableCell align="right">G(T) Diff</TableCell>
                <TableCell align="center">G(T) Status</TableCell>
                <TableCell align="right">W(T) Diff</TableCell>
                <TableCell align="center">W(T) Status</TableCell>
                <TableCell align="center">Overall</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {qaData.stations.map((station) => {
                const isDeleted = deletedStationIndices.has(station.index);
                return (
                  <TableRow
                    key={station.index}
                    sx={{
                      opacity: isDeleted ? 0.4 : 1,
                      textDecoration: isDeleted ? 'line-through' : 'none',
                      bgcolor: isDeleted ? 'error.50' : 'inherit',
                    }}
                  >
                    <TableCell>{station.index}</TableCell>
                    <TableCell align="right">{station.md.toFixed(2)}</TableCell>
                    <TableCell align="right">{station.inc.toFixed(2)}</TableCell>
                    <TableCell align="right">{station.azi.toFixed(2)}</TableCell>
                    <TableCell align="right">{station.g_t.toFixed(1)}</TableCell>
                    <TableCell align="right">{station.w_t.toFixed(1)}</TableCell>
                    <TableCell align="right">{station.g_t_difference.toFixed(1)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={station.g_t_status}
                        color={getStatusColor(station.g_t_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{station.w_t_difference.toFixed(1)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={station.w_t_status}
                        color={getStatusColor(station.w_t_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={station.overall_status}
                        color={station.overall_status === 'PASS' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Approve Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => navigate(`/runs/${runId}`)}
          disabled={isApproving}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleApprove}
          disabled={isApproving}
          startIcon={isApproving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
        >
          {isApproving ? 'Approving...' : 'Approve & Calculate Survey'}
        </Button>
      </Box>
    </Container>
  );
};
