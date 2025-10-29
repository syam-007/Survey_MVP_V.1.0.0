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
  Paper,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  CompareArrows as CompareArrowsIcon,
  Tune as TuneIcon,
  Timeline as TimelineIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  List as ListIcon,
  Info as InfoIcon,
  LocationOn as LocationOnIcon,
  Layers as LayersIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
  Assessment as AssessmentIcon,
  Calculate as CalculateIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SuccessSnackbar } from '../../components/common/SuccessSnackbar';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { useGetRunByIdQuery, useDeleteRunMutation, useGetRunsQuery } from '../../stores/runsSlice';
import { useComparisonHistory } from '../../hooks/useComparison';
import { useExtrapolationsByRun } from '../../hooks/useExtrapolation';
import { ComparisonDialog } from '../../components/comparison/ComparisonDialog';
import { ExtrapolationDialog } from '../../components/survey/ExtrapolationDialog';
import { DuplicateSurveyDialog } from '../../components/survey/DuplicateSurveyDialog';
import { SurveyUploadDialog } from '../../components/survey/SurveyUploadDialog';
import { GTLQAUploadDialog } from '../../components/survey/GTLQAUploadDialog';
import { ActivityLogDialog } from '../../components/activity/ActivityLogDialog';
import surveysService from '../../services/surveysService';
import type { SurveyType, RunType } from '../../types/run.types';

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

  // Fetch all runs for navigation
  const { data: runsData } = useGetRunsQuery({ page: 1, page_size: 1000 });

  // Fetch comparison history
  const { data: comparisonsData } = useComparisonHistory(id!, 1, 5);

  // Fetch extrapolations
  const { data: extrapolations } = useExtrapolationsByRun(id!);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [surveyUploadDialogOpen, setSurveyUploadDialogOpen] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [extrapolationDialogOpen, setExtrapolationDialogOpen] = useState(false);
  const [duplicateSurveyDialogOpen, setDuplicateSurveyDialogOpen] = useState(false);
  const [activityLogDialogOpen, setActivityLogDialogOpen] = useState(false);
  const [deleteSurveyFileDialogOpen, setDeleteSurveyFileDialogOpen] = useState(false);
  const [selectedSurveyFileId, setSelectedSurveyFileId] = useState<string | null>(null);
  const [deletingSurveyFile, setDeletingSurveyFile] = useState(false);

  // All authenticated users have full access (read, write, delete)
  const canEdit = true;

  // Calculate previous and next runs
  const allRuns = runsData?.results || [];
  const currentIndex = allRuns.findIndex((r) => r.id === id);
  const previousRun = currentIndex > 0 ? allRuns[currentIndex - 1] : null;
  const nextRun = currentIndex >= 0 && currentIndex < allRuns.length - 1 ? allRuns[currentIndex + 1] : null;

  const comparisons = comparisonsData?.results || [];

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

  const handleDeleteSurveyFile = async () => {
    if (!selectedSurveyFileId) return;

    setDeletingSurveyFile(true);
    try {
      await surveysService.deleteSurveyFile(selectedSurveyFileId);
      // Refetch run data to update the survey files list
      refetch();
      setDeleteSurveyFileDialogOpen(false);
      setSelectedSurveyFileId(null);
    } catch (error) {
      console.error('Failed to delete survey file:', error);
      alert('Failed to delete survey file. Please try again.');
    } finally {
      setDeletingSurveyFile(false);
    }
  };

  const getRunTypeColor = (type: SurveyType) => {
    const colors: Record<SurveyType, 'primary' | 'secondary' | 'success' | 'default'> = {
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
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => setActivityLogDialogOpen(true)}
              color="primary"
            >
              Activity Log
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

      {/* Modern Action Buttons */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          background: 'linear-gradient(to right, #fafafa 0%, #f5f5f5 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => setSurveyUploadDialogOpen(true)}
            disabled={!run.has_tieon}
            size="large"
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #00ACC1 90%)',
              },
            }}
          >
            Upload Survey
          </Button>
          <Button
            variant="contained"
            startIcon={<CompareArrowsIcon />}
            onClick={() => setComparisonDialogOpen(true)}
            size="large"
            sx={{
              background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
              boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #E91E63 30%, #FF5722 90%)',
              },
            }}
          >
            Compare Surveys
          </Button>
          <Button
            variant="contained"
            startIcon={<TuneIcon />}
            onClick={() => navigate(`/runs/${id}/adjustment`)}
            size="large"
            sx={{
              background: 'linear-gradient(45deg, #00BCD4 30%, #2196F3 90%)',
              boxShadow: '0 3px 5px 2px rgba(0, 188, 212, .3)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #0097A7 30%, #1976D2 90%)',
              },
            }}
          >
            Adjust Survey
          </Button>
          <Button
            variant="contained"
            startIcon={<TimelineIcon />}
            onClick={() => setExtrapolationDialogOpen(true)}
            size="large"
            sx={{
              background: 'linear-gradient(45deg, #9C27B0 30%, #BA68C8 90%)',
              boxShadow: '0 3px 5px 2px rgba(156, 39, 176, .3)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #7B1FA2 30%, #9C27B0 90%)',
              },
            }}
          >
            Extrapolation
          </Button>
          <Button
            variant="contained"
            startIcon={<CalculateIcon />}
            onClick={() => setDuplicateSurveyDialogOpen(true)}
            size="large"
            sx={{
              background: 'linear-gradient(45deg, #FF9800 30%, #FFB74D 90%)',
              boxShadow: '0 3px 5px 2px rgba(255, 152, 0, .3)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #F57C00 30%, #FF9800 90%)',
              },
            }}
          >
            Duplicate Survey
          </Button>
        </Stack>
      </Paper>

      {/* Navigation Bar */}
      <Paper
        elevation={2}
        sx={{
          p: 2.5,
          mb: 3,
          background: 'linear-gradient(to right, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            startIcon={<NavigateBeforeIcon />}
            onClick={() => previousRun && navigate(`/runs/${previousRun.id}`)}
            disabled={!previousRun}
            variant="contained"
            size="medium"
            sx={{
              bgcolor: 'white',
              color: 'primary.main',
              '&:hover': { bgcolor: 'grey.100' },
              '&:disabled': { bgcolor: 'grey.200' },
            }}
          >
            Previous: {previousRun?.run_number || 'None'}
          </Button>

          <Chip
            icon={<ListIcon />}
            label={`All Runs (${runsData?.count || 0})`}
            onClick={() => navigate('/runs')}
            sx={{
              fontSize: '1rem',
              py: 2.5,
              bgcolor: 'white',
              fontWeight: 'medium',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'grey.100' },
            }}
          />

          <Button
            endIcon={<NavigateNextIcon />}
            onClick={() => nextRun && navigate(`/runs/${nextRun.id}`)}
            disabled={!nextRun}
            variant="contained"
            size="medium"
            sx={{
              bgcolor: 'white',
              color: 'primary.main',
              '&:hover': { bgcolor: 'grey.100' },
              '&:disabled': { bgcolor: 'grey.200' },
            }}
          >
            Next: {nextRun?.run_number || 'None'}
          </Button>
        </Box>
      </Paper>

      <Stack spacing={3}>
        {/* Row 1: Basic Information */}
        <Box>
          <Card
            elevation={3}
            sx={{
              borderRadius: 2,
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                <InfoIcon color="primary" sx={{ fontSize: 28 }} />
                <Typography variant="h6" fontWeight="bold">
                  Basic Information
                </Typography>
              </Stack>
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
                    label={run.survey_type}
                    color={getRunTypeColor(run.survey_type)}
                    size="small"
                  />
                </Box>
              </Box>

              {run.tieon && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      BHC Enabled
                    </Typography>
                    <Typography variant="body1">
                      {run.tieon.is_bhc ? 'Yes' : 'No'}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Proposal Direction (°)
                    </Typography>
                    <Typography variant="body1">
                      {run.tieon.proposal_direction ?? 'N/A'}
                    </Typography>
                  </Box>
                </>
              )}

              {run.location && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Grid Correction
                  </Typography>
                  <Typography variant="body1">
                    {run.location.grid_correction ?? 'N/A'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
          </Box>

        {/* Row 2: Well Info and Depth (no gap) */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={0}>
          {/* Well Information */}
          <Box sx={{ flex: 1 }}>
            <Card
              elevation={3}
              sx={{
                borderRadius: 2,
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 },
              }}
            >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                <LayersIcon color="secondary" sx={{ fontSize: 28 }} />
                <Typography variant="h6" fontWeight="bold">
                  Well Information
                </Typography>
              </Stack>
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

          {/* Depth Information */}
          {run.depth && (
            <Box sx={{ flex: 1 }}>
              <Card
                elevation={3}
                sx={{
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 },
                }}
              >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                  <LayersIcon color="success" sx={{ fontSize: 28 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Depth
                  </Typography>
                </Stack>
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

        {/* Row 3: Location */}
        {run.location && (
          <Box>
            <Card
              elevation={3}
              sx={{
                borderRadius: 2,
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 },
              }}
            >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                <LocationOnIcon color="error" sx={{ fontSize: 28 }} />
                <Typography variant="h6" fontWeight="bold">
                  Location
                </Typography>
              </Stack>
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

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'primary.main' }}>
                  Calculated Fields
                </Typography>

                <Stack direction="row" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Grid Correction
                    </Typography>
                    <Typography variant="body1">
                      {run.location.grid_correction ?? 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      w(t) - Scale Factor
                    </Typography>
                    <Typography variant="body1">
                      {run.location.w_t != null ? Number(run.location.w_t).toFixed(2) : 'N/A'}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Min w(t)
                    </Typography>
                    <Typography variant="body1">
                      {run.location.min_w_t != null ? Number(run.location.min_w_t).toFixed(2) : 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Max w(t)
                    </Typography>
                    <Typography variant="body1">
                      {run.location.max_w_t != null ? Number(run.location.max_w_t).toFixed(2) : 'N/A'}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      g(t) - Grid Convergence
                    </Typography>
                    <Typography variant="body1">
                      {run.location.g_t != null ? Number(run.location.g_t).toFixed(2) : 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Min g(t)
                    </Typography>
                    <Typography variant="body1">
                      {run.location.min_g_t != null ? Number(run.location.min_g_t).toFixed(2) : 'N/A'}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Max g(t)
                    </Typography>
                    <Typography variant="body1">
                      {run.location.max_g_t != null ? Number(run.location.max_g_t).toFixed(2) : 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    {/* Empty box for alignment */}
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
          </Box>
        )}

        {/* Tie-On Information */}
        <Box>
          <Card
            elevation={3}
            sx={{
              borderRadius: 2,
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                <LinkIcon color="warning" sx={{ fontSize: 28 }} />
                <Typography variant="h6" fontWeight="bold">
                  Tie-On Information
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              {run.tieon ? (
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary">
                        MD (m)
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {run.tieon.md}
                      </Typography>
                    </Box>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary">
                        Inclination (°)
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {run.tieon.inclination}
                      </Typography>
                    </Box>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary">
                        Azimuth (°)
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {run.tieon.azimuth}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip
                    label="Tie-On Configured"
                    color="success"
                    size="small"
                    sx={{ width: 'fit-content' }}
                  />
                </Stack>
              ) : (
                <Alert severity="warning">
                  No tie-on information configured. Please add tie-on data before uploading surveys.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Survey Files Section */}
        {run.survey_files && run.survey_files.length > 0 && (
          <Box>
            <Card
              elevation={3}
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                  <DescriptionIcon color="success" sx={{ fontSize: 28 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Survey Files ({run.survey_files.length})
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  {run.survey_files.map((file) => (
                    <Paper
                      key={file.id}
                      elevation={1}
                      sx={{
                        p: 2,
                        bgcolor: 'white',
                        borderRadius: 1,
                        cursor: file.survey_data_id ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        '&:hover': file.survey_data_id ? {
                          transform: 'translateX(4px)',
                          boxShadow: 3,
                        } : {},
                      }}
                      onClick={() => file.survey_data_id && navigate(`/runs/${id}/surveys/${file.survey_data_id}`)}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box flex={1}>
                          <Typography variant="body1" fontWeight="medium">
                            {file.filename}
                          </Typography>
                          <Stack direction="row" spacing={2} mt={0.5}>
                            <Typography variant="caption" color="text.secondary">
                              Type: {file.survey_type}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Uploaded: {format(new Date(file.upload_date), 'MMM dd, yyyy hh:mm a')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Size: {(file.file_size / 1024).toFixed(2)} KB
                            </Typography>
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={file.processing_status}
                            size="small"
                            color={
                              file.processing_status === 'completed' ? 'success' :
                              file.processing_status === 'failed' ? 'error' :
                              file.processing_status === 'processing' ? 'warning' :
                              'default'
                            }
                          />
                          {file.survey_data_id && (
                            <Tooltip title="View Survey Results">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/runs/${id}/surveys/${file.survey_data_id}`);
                                }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete Survey File">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSurveyFileId(file.id);
                                setDeleteSurveyFileDialogOpen(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>

                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 2 }}
                  startIcon={<CloudUploadIcon />}
                  onClick={() => setSurveyUploadDialogOpen(true)}
                  disabled={!run.has_tieon}
                >
                  Upload New Survey
                </Button>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Comparison Summary */}
        {comparisons.length > 0 && (
          <Box>
            <Card
              elevation={3}
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                  <AssessmentIcon color="info" sx={{ fontSize: 28 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Recent Comparisons ({comparisons.length})
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  {comparisons.map((comparison) => (
                    <Paper
                      key={comparison.id}
                      elevation={1}
                      sx={{
                        p: 2,
                        bgcolor: 'white',
                        borderRadius: 1,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateX(4px)',
                          boxShadow: 3,
                        },
                      }}
                      onClick={() => navigate(`/runs/${id}/comparisons/${comparison.id}`)}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {comparison.primary_survey_info.file_name} vs{' '}
                            {comparison.reference_survey_info.file_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(comparison.created_at), 'MMM dd, yyyy')} •{' '}
                            {comparison.point_count} points
                          </Typography>
                        </Box>
                        <Chip
                          label={`Max Δ: ${comparison.max_deviation.toFixed(2)}m`}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>

                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => navigate(`/runs/${id}/comparison`)}
                  endIcon={<VisibilityIcon />}
                >
                  View All Comparisons
                </Button>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Extrapolations Summary */}
        {extrapolations && extrapolations.length > 0 && (
          <Box>
            <Card
              elevation={3}
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(135deg, #f3e7f5 0%, #d5a6e0 100%)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                  <TimelineIcon color="secondary" sx={{ fontSize: 28 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Recent Extrapolations ({extrapolations.length})
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  {extrapolations.slice(0, 5).map((extrapolation) => (
                    <Paper
                      key={extrapolation.id}
                      elevation={1}
                      sx={{
                        p: 2,
                        bgcolor: 'white',
                        borderRadius: 1,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateX(4px)',
                          boxShadow: 3,
                        },
                      }}
                      onClick={() => navigate(`/runs/${id}/extrapolation/${extrapolation.id}`)}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {extrapolation.survey_file_name} • {extrapolation.extrapolation_method}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(extrapolation.created_at), 'MMM dd, yyyy')} •{' '}
                            Extended by {extrapolation.extrapolation_length}m •{' '}
                            {extrapolation.extrapolated_point_count} new points
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={`Final MD: ${extrapolation.final_md.toFixed(2)}m`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                          <Tooltip title="View Extrapolation">
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/runs/${id}/extrapolation/${extrapolation.id}`);
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Metadata */}
        <Box>
          <Card
            elevation={3}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                <InfoIcon sx={{ fontSize: 28, color: 'white' }} />
                <Typography variant="h6" fontWeight="bold" color="white">
                  Metadata
                </Typography>
              </Stack>
              <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.3)' }} />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <Paper
                  elevation={0}
                  sx={{
                    flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' },
                    p: 2,
                    bgcolor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 2,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <PersonIcon sx={{ color: 'white', fontSize: 20 }} />
                    <Typography variant="caption" color="rgba(255,255,255,0.8)">
                      Created By
                    </Typography>
                  </Stack>
                  <Typography variant="body1" color="white" fontWeight="medium">
                    {run.user.username}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.7)">
                    {run.user.email}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' },
                    p: 2,
                    bgcolor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 2,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <CalendarIcon sx={{ color: 'white', fontSize: 20 }} />
                    <Typography variant="caption" color="rgba(255,255,255,0.8)">
                      Created At
                    </Typography>
                  </Stack>
                  <Typography variant="body1" color="white" fontWeight="medium">
                    {format(new Date(run.created_at), 'MMM dd, yyyy')}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.7)">
                    {format(new Date(run.created_at), 'hh:mm a')}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' },
                    p: 2,
                    bgcolor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 2,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <CalendarIcon sx={{ color: 'white', fontSize: 20 }} />
                    <Typography variant="caption" color="rgba(255,255,255,0.8)">
                      Last Updated
                    </Typography>
                  </Stack>
                  <Typography variant="body1" color="white" fontWeight="medium">
                    {format(new Date(run.updated_at), 'MMM dd, yyyy')}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.7)">
                    {format(new Date(run.updated_at), 'hh:mm a')}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' },
                    p: 2,
                    bgcolor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 2,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <DescriptionIcon sx={{ color: 'white', fontSize: 20 }} />
                    <Typography variant="caption" color="rgba(255,255,255,0.8)">
                      Run ID
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    color="white"
                    sx={{
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {run.id}
                  </Typography>
                </Paper>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>

      {/* Delete Confirmation Dialog */}
      {/* Delete Survey File Confirmation Dialog */}
      <ConfirmDialog
        open={deleteSurveyFileDialogOpen}
        title="Delete Survey File"
        message="Are you sure you want to delete this survey file? This action cannot be undone and will permanently delete the file and all associated survey data."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteSurveyFile}
        onCancel={() => {
          setDeleteSurveyFileDialogOpen(false);
          setSelectedSurveyFileId(null);
        }}
        loading={deletingSurveyFile}
        severity="error"
      />

      {/* Delete Run Confirmation Dialog */}
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

      {/* Comparison Dialog */}
      {run && (
        <ComparisonDialog
          open={comparisonDialogOpen}
          run={run}
          onClose={() => setComparisonDialogOpen(false)}
        />
      )}

      {/* Extrapolation Dialog */}
      {run && (
        <ExtrapolationDialog
          open={extrapolationDialogOpen}
          run={run}
          onClose={() => setExtrapolationDialogOpen(false)}
        />
      )}

      {/* Duplicate Survey Dialog */}
      {run && (
        <DuplicateSurveyDialog
          open={duplicateSurveyDialogOpen}
          run={run}
          onClose={() => setDuplicateSurveyDialogOpen(false)}
        />
      )}

      {/* Survey Upload Dialog - Use GTL QA Dialog for GTL surveys, regular for others */}
      {run && run.survey_type === 'GTL' ? (
        <GTLQAUploadDialog
          open={surveyUploadDialogOpen}
          run={run}
          onClose={() => setSurveyUploadDialogOpen(false)}
          onSuccess={() => {
            // Refetch run data to update the survey files list
            refetch();
          }}
        />
      ) : run && (
        <SurveyUploadDialog
          open={surveyUploadDialogOpen}
          run={run}
          onClose={() => setSurveyUploadDialogOpen(false)}
          onSuccess={() => {
            // Refetch run data to update the survey files list
            refetch();
          }}
        />
      )}

      {/* Activity Log Dialog */}
      {run && (
        <ActivityLogDialog
          open={activityLogDialogOpen}
          runId={run.id}
          runName={run.run_name}
          onClose={() => setActivityLogDialogOpen(false)}
        />
      )}
    </Container>
  );
};
