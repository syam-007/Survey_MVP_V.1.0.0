/**
 * ComparisonHistoryList Component
 *
 * Lists previous comparisons for a run with pagination.
 */
import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Chip,
  Stack,
  Pagination,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  useComparisonHistory,
  useDeleteComparison,
  useExportComparison,
} from '../../hooks/useComparison';

interface ComparisonHistoryListProps {
  runId: string;
}

export const ComparisonHistoryList: React.FC<ComparisonHistoryListProps> = ({ runId }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { data, isLoading, error } = useComparisonHistory(runId, page, pageSize);
  const { deleteComparison, isDeleting } = useDeleteComparison();
  const { exportComparison, isExporting } = useExportComparison();

  const handleDelete = async (comparisonId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this comparison?')) {
      return;
    }

    try {
      await deleteComparison(comparisonId);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleExport = async (comparisonId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      await exportComparison({
        comparisonId,
        format: 'excel',
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleView = (comparisonId: string) => {
    // Navigate to comparison detail view or open in modal
    navigate(`/runs/${runId}/comparisons/${comparisonId}`);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load comparison history: {error.message}
      </Alert>
    );
  }

  if (!data || data.results.length === 0) {
    return (
      <Alert severity="info">
        No comparisons found for this run. Create a new comparison to get started.
      </Alert>
    );
  }

  return (
    <Box>
      <List disablePadding>
        {data.results.map((comparison) => (
          <ListItem
            key={comparison.id}
            disablePadding
            secondaryAction={
              <Stack direction="row" spacing={1}>
                <Tooltip title="View Details">
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleView(comparison.id)}
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download Excel">
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => handleExport(comparison.id, e)}
                    disabled={isExporting}
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    edge="end"
                    size="small"
                    color="error"
                    onClick={(e) => handleDelete(comparison.id, e)}
                    disabled={isDeleting}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            }
            sx={{ mb: 1 }}
          >
            <ListItemButton
              onClick={() => handleView(comparison.id)}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Typography variant="body1" fontWeight="medium">
                      {comparison.primary_survey_info.file_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      vs
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {comparison.reference_survey_info.file_name}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box component="div">
                    <Stack direction="row" spacing={2} mt={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Created: {format(new Date(comparison.created_at), 'MMM dd, yyyy hh:mm a')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        By: {comparison.created_by_username}
                      </Typography>
                      <Box display="flex" gap={0.5}>
                        <Chip
                          label={`${comparison.point_count} points`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`Max: ${comparison.max_deviation.toFixed(2)}m`}
                          size="small"
                          color="error"
                        />
                        <Chip
                          label={`Ratio: ${comparison.ratio_factor}`}
                          size="small"
                          color="primary"
                        />
                      </Box>
                    </Stack>
                  </Box>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {data.total_pages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={data.total_pages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
};
