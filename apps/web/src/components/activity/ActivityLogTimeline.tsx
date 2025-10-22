/**
 * ActivityLogTimeline Component
 *
 * Displays activity logs in a timeline format for audit trail.
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Pagination,
  Stack,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CompareArrows as CompareIcon,
  Calculate as CalculateIcon,
  Timeline as TimelineIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  FileDownload as ExportIcon,
  Tune as AdjustIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import activityLogService, { type ActivityLog } from '../../services/activityLogService';

interface ActivityLogTimelineProps {
  runId: string;
  pageSize?: number;
}

// Map activity types to icons and colors
const ACTIVITY_CONFIG: Record<string, { icon: React.ReactNode; color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' }> = {
  run_created: { icon: <AddIcon />, color: 'success' },
  run_updated: { icon: <EditIcon />, color: 'info' },
  run_deleted: { icon: <DeleteIcon />, color: 'error' },
  survey_uploaded: { icon: <UploadIcon />, color: 'primary' },
  survey_deleted: { icon: <DeleteIcon />, color: 'error' },
  survey_calculated: { icon: <CalculateIcon />, color: 'success' },
  survey_interpolated: { icon: <TimelineIcon />, color: 'info' },
  survey_viewed: { icon: <ViewIcon />, color: 'info' },
  comparison_created: { icon: <CompareIcon />, color: 'primary' },
  comparison_viewed: { icon: <ViewIcon />, color: 'info' },
  comparison_deleted: { icon: <DeleteIcon />, color: 'error' },
  comparison_exported: { icon: <ExportIcon />, color: 'success' },
  adjustment_applied: { icon: <AdjustIcon />, color: 'warning' },
  adjustment_reset: { icon: <DeleteIcon />, color: 'warning' },
  adjustment_undone: { icon: <EditIcon />, color: 'warning' },
  adjustment_redone: { icon: <EditIcon />, color: 'warning' },
  extrapolation_calculated: { icon: <CalculateIcon />, color: 'primary' },
  extrapolation_saved: { icon: <AddIcon />, color: 'success' },
  extrapolation_deleted: { icon: <DeleteIcon />, color: 'error' },
  duplicate_survey_calculated: { icon: <CalculateIcon />, color: 'primary' },
  duplicate_survey_exported: { icon: <ExportIcon />, color: 'success' },
  reference_survey_uploaded: { icon: <UploadIcon />, color: 'primary' },
  reference_survey_deleted: { icon: <DeleteIcon />, color: 'error' },
  tieon_created: { icon: <AddIcon />, color: 'success' },
  tieon_updated: { icon: <EditIcon />, color: 'info' },
  tieon_deleted: { icon: <DeleteIcon />, color: 'error' },
  data_exported: { icon: <ExportIcon />, color: 'success' },
};

export const ActivityLogTimeline: React.FC<ActivityLogTimelineProps> = ({ runId, pageSize = 10 }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await activityLogService.getActivityLogsByRun(runId, page, pageSize);
        setLogs(response.results);
        setTotalCount(response.count);
      } catch (err: any) {
        console.error('Failed to fetch activity logs:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load activity logs');
      } finally {
        setIsLoading(false);
      }
    };

    if (runId) {
      fetchLogs();
    }
  }, [runId, page, pageSize]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const getActivityConfig = (activityType: string) => {
    return ACTIVITY_CONFIG[activityType] || { icon: <EditIcon />, color: 'info' as const };
  };

  const getUserInitials = (userName: string) => {
    if (userName === 'System') return 'SYS';
    const names = userName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return userName.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (logs.length === 0) {
    return (
      <Alert severity="info">
        No activity logs found. Activity will be logged as actions are performed on this run.
      </Alert>
    );
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Box>
      <Stack spacing={2}>
        {logs.map((log) => {
          const config = getActivityConfig(log.activity_type);

          return (
            <Paper key={log.id} elevation={2} sx={{ p: 2, position: 'relative', overflow: 'hidden' }}>
              {/* Color indicator on left */}
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  bgcolor: `${config.color}.main`,
                }}
              />

              <Box display="flex" gap={2} pl={1}>
                {/* Icon and Avatar */}
                <Box display="flex" flexDirection="column" alignItems="center" gap={1} minWidth={60}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: `${config.color}.light`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: `${config.color}.dark`,
                    }}
                  >
                    {config.icon}
                  </Box>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: '0.75rem',
                      bgcolor: 'primary.main',
                    }}
                  >
                    {getUserInitials(log.user_name)}
                  </Avatar>
                </Box>

                {/* Content */}
                <Box flex={1}>
                  <Stack spacing={1}>
                    {/* Header */}
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Chip
                        label={log.activity_type_display}
                        color={config.color}
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary">
                        by <strong>{log.user_name}</strong>
                      </Typography>
                    </Box>

                    {/* Description */}
                    <Typography variant="body2">{log.description}</Typography>

                    {/* Metadata */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                          border: 1,
                          borderColor: 'grey.200',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                          Additional Details:
                        </Typography>
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <Typography key={key} variant="caption" display="block">
                            <strong>{key}:</strong> {JSON.stringify(value)}
                          </Typography>
                        ))}
                      </Box>
                    )}

                    {/* Timestamp */}
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(log.created_at), 'MMM dd, yyyy')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        •
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(log.created_at), 'hh:mm a')}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Stack>

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      <Box mt={2} textAlign="center">
        <Typography variant="caption" color="text.secondary">
          Showing {logs.length} of {totalCount} activities
        </Typography>
      </Box>
    </Box>
  );
};
