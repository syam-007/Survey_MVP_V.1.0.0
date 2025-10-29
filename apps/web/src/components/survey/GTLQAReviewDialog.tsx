/**
 * GTL QA Review Dialog Component
 * Displays QA results for GTL survey uploads and allows users to review,
 * delete stations, and save approved data to database.
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Checkbox,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import qaService from '../../services/qaService';
import type { QAResult, QAStation } from '../../services/qaService';

interface GTLQAReviewDialogProps {
  open: boolean;
  qaData: QAResult | null;
  onClose: () => void;
  onSaveSuccess: () => void;
  runId: string;
}

const GTLQAReviewDialog: React.FC<GTLQAReviewDialogProps> = ({
  open,
  qaData,
  onClose,
  onSaveSuccess,
  runId,
}) => {
  const navigate = useNavigate();
  const [deletedIndices, setDeletedIndices] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStations, setSelectedStations] = useState<Set<number>>(new Set());

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open && qaData) {
      setDeletedIndices(new Set());
      setSelectedStations(new Set());
      setError(null);
    }
  }, [open, qaData]);

  // Get filtered stations (excluding deleted ones)
  const filteredStations = useMemo(() => {
    if (!qaData) return [];
    return qaData.stations.filter((_, index) => !deletedIndices.has(index));
  }, [qaData, deletedIndices]);

  // Recalculate summary based on filtered stations
  const recalculatedSummary = useMemo(() => {
    const passCount = filteredStations.filter(s => s.overall_status === 'PASS').length;
    const removeCount = filteredStations.filter(s => s.overall_status === 'REMOVE').length;

    return {
      ...qaData?.summary,
      total_stations: filteredStations.length,
      pass_count: passCount,
      remove_count: removeCount,
    };
  }, [filteredStations, qaData]);

  const handleDeleteStation = (index: number) => {
    setDeletedIndices(prev => new Set([...prev, index]));
    setSelectedStations(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleSelectStation = (index: number) => {
    setSelectedStations(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedStations.size === filteredStations.length) {
      setSelectedStations(new Set());
    } else {
      setSelectedStations(new Set(filteredStations.map(s => s.index)));
    }
  };

  const handleDeleteSelected = () => {
    setDeletedIndices(prev => new Set([...prev, ...selectedStations]));
    setSelectedStations(new Set());
  };

  const handleCalculateSurvey = async () => {
    if (!qaData) return;

    setIsSaving(true);
    setError(null);

    try {
      // Get indices to keep (all stations that aren't deleted)
      const indicesToKeep = qaData.stations
        .map((_, index) => index)
        .filter(index => !deletedIndices.has(index));

      let response;

      // Check if this is temporary QA (temp_qa_id) or permanent QA (qa_id)
      if (qaData.temp_qa_id) {
        // New flow: Approve temporary QA and save to database
        response = await qaService.approveTempQA(qaData.temp_qa_id, indicesToKeep);
      } else if (qaData.qa_id) {
        // Old flow: Save already-created QA record
        response = await qaService.saveQAApproved(qaData.qa_id, indicesToKeep);
      } else {
        throw new Error('No QA ID found in QA data');
      }

      // Call success callback
      onSaveSuccess();
      onClose();

      // Navigate to survey results page
      const surveyDataId = response.survey_data_id || response.id || response.survey_data?.id;
      if (surveyDataId) {
        navigate(`/runs/${runId}/surveys/${surveyDataId}`);
      }
    } catch (err: any) {
      console.error('Error calculating survey:', err);
      setError(err.response?.data?.error || err.response?.data?.calculation_error || 'Failed to calculate survey');
    } finally {
      setIsSaving(false);
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

  if (!qaData) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">GTL Survey QA Review</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {qaData.file_name}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Total Stations
                </Typography>
                <Typography variant="h4">{recalculatedSummary.total_stations}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Original: {qaData.summary.total_stations}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  PASS Stations
                </Typography>
                <Typography variant="h4" color="success.dark">
                  {recalculatedSummary.pass_count}
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
                  {recalculatedSummary.remove_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'info.light' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Deleted by User
                </Typography>
                <Typography variant="h4" color="info.dark">
                  {deletedIndices.size}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  G(t) Quality Score
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="h6">{qaData.summary.g_t_score}</Typography>
                  <Chip
                    label={`${qaData.summary.g_t_percentage.toFixed(1)}%`}
                    color={qaData.summary.g_t_percentage >= 80 ? 'success' : 'warning'}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Location G(t): {qaData.summary.location_g_t.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  W(t) Quality Score
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="h6">{qaData.summary.w_t_score}</Typography>
                  <Chip
                    label={`${qaData.summary.w_t_percentage.toFixed(1)}%`}
                    color={qaData.summary.w_t_percentage >= 80 ? 'success' : 'warning'}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Location W(t): {qaData.summary.location_w_t.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Alert Message */}
        <Alert severity="info" sx={{ mb: 2 }}>
          Review the QA results below. Delete any stations you don't want to include, then click "Calculate Survey" to proceed with the approved data.
        </Alert>

        {/* Bulk Actions */}
        {selectedStations.size > 0 && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteSelected}
            >
              Delete Selected ({selectedStations.size})
            </Button>
          </Box>
        )}

        {/* Stations Table */}
        <TableContainer component={Paper}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedStations.size === filteredStations.length && filteredStations.length > 0}
                    indeterminate={selectedStations.size > 0 && selectedStations.size < filteredStations.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
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
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStations.map((station) => (
                <TableRow
                  key={station.index}
                  sx={{
                    bgcolor: station.overall_status === 'PASS' ? 'success.lighter' : 'error.lighter',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedStations.has(station.index)}
                      onChange={() => handleSelectStation(station.index)}
                    />
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
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteStation(station.index)}
                      title="Delete this station"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredStations.length === 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            All stations have been deleted. You need at least one station to save.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleCalculateSurvey}
          disabled={isSaving || filteredStations.length === 0}
        >
          {isSaving ? 'Calculating...' : 'Calculate Survey'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GTLQAReviewDialog;
