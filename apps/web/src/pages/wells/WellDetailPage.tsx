import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Chip,
  Button,
  Divider,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SuccessSnackbar } from '../../components/common/SuccessSnackbar';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { useGetWellByIdQuery, useDeleteWellMutation } from '../../stores/wellsSlice';
import type { WellType } from '../../types/well.types';
import type { RunType } from '../../types/run.types';

/**
 * WellDetailPage Component
 * Displays detailed information about a single well with associated runs
 * Based on Story 2.5 AC#3
 */
export const WellDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: well, isLoading, error, refetch } = useGetWellByIdQuery(id!);
  const [deleteWell, { isLoading: isDeleting }] = useDeleteWellMutation();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // All authenticated users have full access (read, write, delete)
  const canEdit = true;

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteWell(id).unwrap();
      setSnackbarOpen(true);
      setTimeout(() => {
        navigate('/wells');
      }, 1000);
    } catch (error) {
      console.error('Failed to delete well:', error);
      setDeleteDialogOpen(false);
    }
  };

  const getWellTypeColor = (type: WellType) => {
    const colors: Record<WellType, 'primary' | 'secondary' | 'success' | 'default'> = {
      Oil: 'primary',
      Gas: 'secondary',
      Water: 'success',
      Other: 'default',
    };
    return colors[type] || 'default';
  };

  const getRunTypeColor = (type: RunType) => {
    const colors: Record<RunType, 'primary' | 'secondary' | 'success' | 'default'> = {
      GTL: 'primary',
      Gyro: 'secondary',
      MWD: 'success',
      Unknown: 'default',
    };
    return colors[type] || 'default';
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <SkeletonLoader variant="detail" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <ErrorAlert
          error={error as Error}
          title="Failed to load well"
          onRetry={refetch}
        />
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/wells')}
          sx={{ mt: 2 }}
        >
          Back to Wells
        </Button>
      </Container>
    );
  }

  if (!well) {
    return (
      <Container maxWidth="lg">
        <ErrorAlert error="Well not found" />
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/wells')}
          sx={{ mt: 2 }}
        >
          Back to Wells
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <PageHeader
        title={well.well_name}
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Wells', path: '/wells' },
          { label: well.well_name },
        ]}
        actions={
          <Box display="flex" gap={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/wells')}
            >
              Back
            </Button>
            {canEdit && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/wells/${id}/edit`)}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete
                </Button>
              </>
            )}
          </Box>
        }
      />

      <Stack spacing={3}>
        {/* Well Information Card */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Well Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                sx={{ flexWrap: 'wrap' }}
              >
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%' } }}>
                  <Typography variant="caption" color="text.secondary">
                    Well Name
                  </Typography>
                  <Typography variant="body1">{well.well_name}</Typography>
                </Box>

                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%' } }}>
                  <Typography variant="caption" color="text.secondary">
                    Well Type
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={well.well_type}
                      color={getWellTypeColor(well.well_type)}
                      size="small"
                    />
                  </Box>
                </Box>

                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%' } }}>
                  <Typography variant="caption" color="text.secondary">
                    Total Runs
                  </Typography>
                  <Typography variant="body1">{well.runs_count}</Typography>
                </Box>

                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%' } }}>
                  <Typography variant="caption" color="text.secondary">
                    Created At
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(well.created_at), 'MMM dd, yyyy')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(well.created_at), 'hh:mm a')}
                  </Typography>
                </Box>

                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%' } }}>
                  <Typography variant="caption" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(well.updated_at), 'MMM dd, yyyy')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(well.updated_at), 'hh:mm a')}
                  </Typography>
                </Box>

                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%' } }}>
                  <Typography variant="caption" color="text.secondary">
                    Well ID
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {well.id}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Associated Runs Section */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Associated Runs ({well.runs_count})
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {well.runs && well.runs.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Run Number</TableCell>
                        <TableCell>Run Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {well.runs.map((run) => (
                        <TableRow key={run.id} hover>
                          <TableCell>{run.run_number}</TableCell>
                          <TableCell>{run.run_name}</TableCell>
                          <TableCell>
                            <Chip
                              label={run.run_type}
                              color={getRunTypeColor(run.run_type)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/runs/${run.id}`)}
                              title="View run details"
                            >
                              <ViewIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No runs associated with this well
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Stack>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Well"
        message={`Are you sure you want to delete "${well.well_name}"? This action will set the well field to NULL for all ${well.runs_count} associated run(s). The runs themselves will not be deleted.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={isDeleting}
        severity="error"
      />

      {/* Success Snackbar */}
      <SuccessSnackbar
        open={snackbarOpen}
        message="Well deleted successfully! Redirecting..."
        onClose={() => setSnackbarOpen(false)}
      />
    </Container>
  );
};
