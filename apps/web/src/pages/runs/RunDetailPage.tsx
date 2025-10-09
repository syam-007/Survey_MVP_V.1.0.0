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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SuccessSnackbar } from '../../components/common/SuccessSnackbar';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { useGetRunByIdQuery, useDeleteRunMutation } from '../../stores/runsSlice';
import type { RunType } from '../../types/run.types';

/**
 * RunDetailPage Component
 * Displays detailed information about a single run
 * Based on Story 2.4 AC#3
 */
export const RunDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: run, isLoading, error, refetch } = useGetRunByIdQuery(id!);
  const [deleteRun, { isLoading: isDeleting }] = useDeleteRunMutation();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // All authenticated users have full access (read, write, delete)
  const canEdit = true;

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteRun(id).unwrap();
      setSnackbarOpen(true);
      setTimeout(() => {
        navigate('/runs');
      }, 1000);
    } catch (error) {
      console.error('Failed to delete run:', error);
      setDeleteDialogOpen(false);
    }
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
          title="Failed to load run"
          onRetry={refetch}
        />
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/runs')}
          sx={{ mt: 2 }}
        >
          Back to Runs
        </Button>
      </Container>
    );
  }

  if (!run) {
    return (
      <Container maxWidth="lg">
        <ErrorAlert error="Run not found" />
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/runs')}
          sx={{ mt: 2 }}
        >
          Back to Runs
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <PageHeader
        title={run.run_name}
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Runs', path: '/runs' },
          { label: run.run_number },
        ]}
        actions={
          <Box display="flex" gap={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/runs')}
            >
              Back
            </Button>
            {canEdit && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/runs/${id}/edit`)}
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
        {/* Row 1: Basic Info and Well Info */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {/* Basic Information */}
          <Box sx={{ flex: 1 }}>
            <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Run Number
                </Typography>
                <Typography variant="body1">{run.run_number}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Run Name
                </Typography>
                <Typography variant="body1">{run.run_name}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Run Type
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={run.run_type}
                    color={getRunTypeColor(run.run_type)}
                    size="small"
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Vertical Section
                </Typography>
                <Typography variant="body1">
                  {run.vertical_section ?? 'N/A'}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  BHC Enabled
                </Typography>
                <Typography variant="body1">
                  {run.bhc_enabled ? 'Yes' : 'No'}
                </Typography>
              </Box>

              {!run.bhc_enabled && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Proposal Direction
                  </Typography>
                  <Typography variant="body1">
                    {run.proposal_direction ?? 'N/A'}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Grid Correction
                </Typography>
                <Typography variant="body1">
                  {run.grid_correction ?? 'N/A'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
          </Box>

          {/* Well Information */}
          <Box sx={{ flex: 1 }}>
            <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Well Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {run.well ? (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Well Name
                    </Typography>
                    <Typography variant="body1">{run.well.well_name}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Well Type
                    </Typography>
                    <Typography variant="body1">{run.well.well_type}</Typography>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No well associated with this run
                </Typography>
              )}
            </CardContent>
          </Card>
          </Box>
        </Stack>

        {/* Row 2: Location and Depth */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {/* Location Information */}
          {run.location && (
            <Box sx={{ flex: 1 }}>
              <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Location
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Latitude
                      </Typography>
                      <Typography variant="body1">
                        {run.location.latitude}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Longitude
                      </Typography>
                      <Typography variant="body1">
                        {run.location.longitude}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Easting
                      </Typography>
                      <Typography variant="body1">
                        {run.location.easting}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Northing
                      </Typography>
                      <Typography variant="body1">
                        {run.location.northing}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
            </Box>
          )}

          {/* Depth Information */}
          {run.depth && (
            <Box sx={{ flex: 1 }}>
              <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Depth
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Elevation Reference
                  </Typography>
                  <Typography variant="body1">
                    {run.depth.elevation_reference}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Reference Height
                  </Typography>
                  <Typography variant="body1">
                    {run.depth.reference_height}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            </Box>
          )}
        </Stack>

        {/* Metadata */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Metadata
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                sx={{ flexWrap: 'wrap' }}
              >
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
                  <Typography variant="caption" color="text.secondary">
                    Created By
                  </Typography>
                  <Typography variant="body1">{run.user.username}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {run.user.email}
                  </Typography>
                </Box>

                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
                  <Typography variant="caption" color="text.secondary">
                    Created At
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(run.created_at), 'MMM dd, yyyy')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(run.created_at), 'hh:mm a')}
                  </Typography>
                </Box>

                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
                  <Typography variant="caption" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(run.updated_at), 'MMM dd, yyyy')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(run.updated_at), 'hh:mm a')}
                  </Typography>
                </Box>

                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
                  <Typography variant="caption" color="text.secondary">
                    Run ID
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {run.id}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Run"
        message={`Are you sure you want to delete "${run.run_name}"? This action will soft delete the run and it can be recovered later.`}
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
        message="Run deleted successfully! Redirecting..."
        onClose={() => setSnackbarOpen(false)}
      />
    </Container>
  );
};
