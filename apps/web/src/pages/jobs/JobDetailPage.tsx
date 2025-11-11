import config from '../../config/env';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Container,
  Grid,
  Typography,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Settings as SettingsIcon,
  Build as BuildIcon,
  ExpandMore as ExpandMoreIcon,
  CompareArrows as CompareIcon,
  Tune as AdjustmentIcon,
  ContentCopy as DuplicateIcon,
  TrendingUp as ExtrapolationIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SuccessSnackbar } from '../../components/common/SuccessSnackbar';
import {
  useGetJobByIdQuery,
  useGetJobRunsQuery,
  useDeleteJobMutation,
} from '../../stores/jobsSlice';
import type { JobStatus } from '../../types/job.types';

/**
 * JobDetailPage Component
 * Displays detailed information about a job and its associated runs
 */
export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [downloadingPrejob, setDownloadingPrejob] = useState(false);
  const [downloadingSOE, setDownloadingSOE] = useState(false);

  // Accordion expanded state
  const [masterDataExpanded, setMasterDataExpanded] = useState(true);

  // Fetch job and runs
  const { data: job, isLoading, error, refetch } = useGetJobByIdQuery(id!);
  const { data: runs, isLoading: loadingRuns } = useGetJobRunsQuery(id!);
  const [deleteJob, { isLoading: isDeleting }] = useDeleteJobMutation();

  // Handle delete
  const handleDeleteConfirm = async () => {
    try {
      await deleteJob(id!).unwrap();
      setSnackbarMessage('Job deleted successfully');
      setSnackbarOpen(true);
      setDeleteDialogOpen(false);
      setTimeout(() => navigate('/jobs'), 1500);
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  // Get status color
  const getStatusColor = (status: JobStatus): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
    const colors: Record<JobStatus, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
      planned: 'default',
      active: 'primary',
      completed: 'success',
      cancelled: 'error',
      on_hold: 'warning',
    };
    return colors[status] || 'default';
  };

  // Handle prejob report download
  const handleDownloadPrejobReport = async () => {
    setDownloadingPrejob(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${config.apiBaseUrl}/api/v1/jobs/${id}/prejob_report/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate prejob report');
      }

      // Get the blob
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Prejob_Report_${job?.job_number || 'download'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSnackbarMessage('Prejob report downloaded successfully');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error downloading prejob report:', error);
      setSnackbarMessage('Failed to download prejob report');
      setSnackbarOpen(true);
    } finally {
      setDownloadingPrejob(false);
    }
  };

  // Handle SOE report download
  const handleDownloadSOEReport = async () => {
    setDownloadingSOE(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${config.apiBaseUrl}/api/v1/jobs/${id}/soe_report/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate SOE report');
      }

      // Get the blob
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SOE_Report_${job?.job_number || 'download'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSnackbarMessage('SOE report downloaded successfully');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error downloading SOE report:', error);
      setSnackbarMessage('Failed to download SOE report');
      setSnackbarOpen(true);
    } finally {
      setDownloadingSOE(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="xl">
        <SkeletonLoader count={8} height={80} />
      </Container>
    );
  }

  // Error state
  if (error || !job) {
    return (
      <Container maxWidth="xl">
        <ErrorAlert
          message="Failed to load job details. Please try again."
          onRetry={refetch}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <PageHeader
        title={`Job ${job.job_number}`}
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Jobs', path: '/jobs' },
          { label: job.job_number },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/jobs/${id}/edit`)}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
              disabled={(runs?.length || 0) > 0}
            >
              Delete
            </Button>
          </Box>
        }
      />

      <Grid container spacing={3}>
        {/* Job Status Card */}
        {/* <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Status
              </Typography>
              <Chip
                label={job.status.replace('_', ' ').toUpperCase()}
                color={getStatusColor(job.status)}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid> */}

        {/* <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Runs
              </Typography>
              <Typography variant="h4">
                {job.run_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid> */}

        {/* <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Start Date
              </Typography>
              <Typography variant="h6">
                {job.start_date ? format(new Date(job.start_date), 'MMM dd, yyyy') : 'Not set'}
              </Typography>
            </CardContent>
          </Card>
        </Grid> */}

        {/* <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                End Date
              </Typography>
              <Typography variant="h6">
                {job.end_date ? format(new Date(job.end_date), 'MMM dd, yyyy') : 'Not set'}
              </Typography>
            </CardContent>
          </Card>
        </Grid> */}

        {/* Master Data Information */}
        <Grid item xs={12}>
          <Accordion
            expanded={masterDataExpanded}
            onChange={() => setMasterDataExpanded(!masterDataExpanded)}
            sx={{
              boxShadow: 1,
              '&:before': {
                display: 'none',
              }
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="master-data-content"
              id="master-data-header"
              sx={{ px: 3, py: 2 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mr: 2 }}>
                <Typography variant="h6">
                  Master Data
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadPrejobReport();
                    }}
                    disabled={downloadingPrejob}
                    sx={{ textTransform: 'none' }}
                  >
                    {downloadingPrejob ? 'Generating...' : 'Download Prejob Report'}
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSOEReport();
                    }}
                    disabled={downloadingSOE}
                    sx={{ textTransform: 'none' }}
                  >
                    {downloadingSOE ? 'Generating...' : 'Download SOE Report'}
                  </Button>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3, pt: 0 }}>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Customer
                    </Typography>
                    <Typography variant="body1">
                      {job.customer.customer_name}
                      {job.customer.customer_code && ` (${job.customer.customer_code})`}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Client
                    </Typography>
                    <Typography variant="body1">
                      {job.client.client_name}
                      {job.client.client_code && ` (${job.client.client_code})`}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <LocationIcon sx={{ mr: 1, mt: 0.5, color: 'primary.main' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Well
                    </Typography>
                    <Typography variant="body1">
                      {job.well.well_id} - {job.well.well_name}
                    </Typography>
                    {job.well.field_name && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Field: {job.well.field_name}
                      </Typography>
                    )}
                    {job.well.location && (
                      <Box sx={{ mt: 1, pl: 2, borderLeft: '3px solid', borderColor: 'primary.light', backgroundColor: 'action.hover', p: 1, borderRadius: 1 }}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          Location Details
                        </Typography>
                        <Grid container spacing={1}>
                          {/* Geographic Coordinates - Decimal */}
                          {(job.well.location.latitude || job.well.location.longitude) && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                Geographic Coordinates (Decimal):
                              </Typography>
                              <Typography variant="body2">
                                {job.well.location.latitude && `Lat: ${job.well.location.latitude}°`}
                                {job.well.location.latitude && job.well.location.longitude && ', '}
                                {job.well.location.longitude && `Long: ${job.well.location.longitude}°`}
                              </Typography>
                            </Grid>
                          )}

                          {/* Geographic Coordinates - DMS */}
                          {(job.well.location.latitude_degrees !== null || job.well.location.longitude_degrees !== null) && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                Geographic Coordinates (DMS):
                              </Typography>
                              {job.well.location.latitude_degrees !== null && (
                                <Typography variant="body2">
                                  Lat: {job.well.location.latitude_degrees}° {job.well.location.latitude_minutes}' {job.well.location.latitude_seconds}"
                                </Typography>
                              )}
                              {job.well.location.longitude_degrees !== null && (
                                <Typography variant="body2">
                                  Long: {job.well.location.longitude_degrees}° {job.well.location.longitude_minutes}' {job.well.location.longitude_seconds}"
                                </Typography>
                              )}
                            </Grid>
                          )}

                          {/* UTM/Grid Coordinates */}
                          {(job.well.location.easting || job.well.location.northing || job.well.location.north_coordinate || job.well.location.east_coordinate) && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                Grid Coordinates:
                              </Typography>
                              {(job.well.location.easting || job.well.location.northing) && (
                                <Typography variant="body2">
                                  {job.well.location.easting && `Easting: ${job.well.location.easting}m`}
                                  {job.well.location.easting && job.well.location.northing && ', '}
                                  {job.well.location.northing && `Northing: ${job.well.location.northing}m`}
                                </Typography>
                              )}
                              {(job.well.location.north_coordinate || job.well.location.east_coordinate) && (
                                <Typography variant="body2">
                                  {job.well.location.north_coordinate && `North: ${job.well.location.north_coordinate}m`}
                                  {job.well.location.north_coordinate && job.well.location.east_coordinate && ', '}
                                  {job.well.location.east_coordinate && `East: ${job.well.location.east_coordinate}m`}
                                </Typography>
                              )}
                              {job.well.location.map_zone && (
                                <Typography variant="caption" display="block">
                                  Map Zone: {job.well.location.map_zone}
                                </Typography>
                              )}
                            </Grid>
                          )}

                          {/* Geodetic Information */}
                          {(job.well.location.geodetic_datum || job.well.location.geodetic_system) && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                Geodetic System:
                              </Typography>
                              {job.well.location.geodetic_datum && (
                                <Typography variant="body2">
                                  Datum: {job.well.location.geodetic_datum}
                                </Typography>
                              )}
                              {job.well.location.geodetic_system && (
                                <Typography variant="body2">
                                  System: {job.well.location.geodetic_system}
                                </Typography>
                              )}
                            </Grid>
                          )}

                          {/* Grid Corrections & North Reference */}
                          {(job.well.location.grid_correction || job.well.location.central_meridian || job.well.location.north_reference) && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                Grid Parameters:
                              </Typography>
                              {job.well.location.north_reference && (
                                <Typography variant="body2">
                                  North Reference: {job.well.location.north_reference}
                                </Typography>
                              )}
                              {job.well.location.grid_correction !== null && (
                                <Typography variant="body2">
                                  Grid Correction: {job.well.location.grid_correction}°
                                </Typography>
                              )}
                              {job.well.location.central_meridian && (
                                <Typography variant="body2">
                                  Central Meridian: {job.well.location.central_meridian}°
                                </Typography>
                              )}
                            </Grid>
                          )}

                          {/* W/T and G/T Values */}
                          {(job.well.location.w_t || job.well.location.g_t) && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                Survey Parameters:
                              </Typography>
                              {job.well.location.w_t !== null && (
                                <Typography variant="body2">
                                  W/T: {job.well.location.w_t}
                                  {(job.well.location.min_w_t !== null || job.well.location.max_w_t !== null) &&
                                    ` (Min: ${job.well.location.min_w_t}, Max: ${job.well.location.max_w_t})`}
                                </Typography>
                              )}
                              {job.well.location.g_t !== null && (
                                <Typography variant="body2">
                                  G/T: {job.well.location.g_t}
                                  {(job.well.location.min_g_t !== null || job.well.location.max_g_t !== null) &&
                                    ` (Min: ${job.well.location.min_g_t}, Max: ${job.well.location.max_g_t})`}
                                </Typography>
                              )}
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BuildIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Rig
                    </Typography>
                    <Typography variant="body1">
                      {job.rig.rig_number} - {job.rig.rig_name}
                    </Typography>
                    {job.rig.rig_type && (
                      <Typography variant="caption" color="text.secondary">
                        Type: {job.rig.rig_type}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Service
                    </Typography>
                    <Typography variant="body1">
                      {job.service.service_code ? `${job.service.service_code} - ` : ''}{job.service.service_name}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {job.description && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    {job.description}
                  </Typography>
                </Box>
              </>
            )}
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Runs Section - Left Side */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, boxShadow: 1, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Runs ({runs?.length || 0})
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate(`/runs/new/complete?job=${id}`)}
              >
                Create Run
              </Button>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {loadingRuns ? (
              <SkeletonLoader count={3} height={60} />
            ) : runs && runs.length > 0 ? (
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: { xs: 650, sm: 750 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Run Number</TableCell>
                      <TableCell>Run Name</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Survey Type</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Run Type</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Survey Files</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {runs.map((run: any) => (
                      <TableRow key={run.id} hover>
                        <TableCell>
                          {run.run_number}
                          {/* Show survey type on mobile */}
                          <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5 }}>
                            <Chip label={run.survey_type} size="small" color="primary" />
                          </Box>
                        </TableCell>
                        <TableCell>
                          {run.run_name}
                          {/* Show created date on mobile */}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5 }}
                          >
                            {format(new Date(run.created_at), 'MMM dd, yyyy')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          <Chip label={run.survey_type} size="small" color="primary" />
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          {run.run_type || '-'}
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          {run.survey_files_count || 0}
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          {format(new Date(run.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/runs/${run.id}`)}
                            title="View Details"
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  No runs found for this job
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => navigate(`/runs/new/complete?job=${id}`)}
                  sx={{ mt: 2 }}
                >
                  Create First Run
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Operations Section - Right Side */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, boxShadow: 1, height: '100%' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">
                Operations
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2}>
              {/* Comparison Operation */}
              <Grid item xs={12}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateX(4px)',
                      boxShadow: 3,
                    }
                  }}
                  onClick={() => {
                    navigate(`/jobs/${id}/comparison`);
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: '10px',
                          backgroundColor: 'primary.light',
                          color: 'primary.main',
                          mr: 1.5,
                        }}
                      >
                        <CompareIcon />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="600">
                          Comparison
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Compare runs
                        </Typography>
                      </Box>
                    </Box>
                    {/* <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Create new comparison');
                      }}
                    >
                      New
                    </Button> */}
                  </CardContent>
                </Card>
              </Grid>

              {/* Adjustment Operation */}
              <Grid item xs={12}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateX(4px)',
                      boxShadow: 3,
                    }
                  }}
                  onClick={() => {
                    navigate(`/jobs/${id}/adjustment`);
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: '10px',
                          backgroundColor: 'success.light',
                          color: 'success.main',
                          mr: 1.5,
                        }}
                      >
                        <AdjustmentIcon />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="600">
                          Adjustment
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Adjust data
                        </Typography>
                      </Box>
                    </Box>
                    {/* <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/jobs/${id}/adjustment`);
                      }}
                    >
                      New
                    </Button> */}
                  </CardContent>
                </Card>
              </Grid>

              {/* Duplicate Operation */}
              <Grid item xs={12}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateX(4px)',
                      boxShadow: 3,
                    }
                  }}
                  onClick={() => {
                    console.log('Navigate to duplicate');
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: '10px',
                          backgroundColor: 'warning.light',
                          color: 'warning.main',
                          mr: 1.5,
                        }}
                      >
                        <DuplicateIcon />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="600">
                          Duplicate
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Duplicate survey
                        </Typography>
                      </Box>
                    </Box>
                    {/* <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Create new duplicate');
                      }}
                    >
                      New
                    </Button> */}
                  </CardContent>
                </Card>
              </Grid>

              {/* Extrapolation Operation */}
              <Grid item xs={12}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateX(4px)',
                      boxShadow: 3,
                    }
                  }}
                  onClick={() => {
                    console.log('Navigate to extrapolation');
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: '10px',
                          backgroundColor: 'info.light',
                          color: 'info.main',
                          mr: 1.5,
                        }}
                      >
                        <ExtrapolationIcon />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="600">
                          Extrapolation
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Extrapolate data
                        </Typography>
                      </Box>
                    </Box>
                    {/* <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Create new extrapolation');
                      }}
                    >
                      New
                    </Button> */}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Job"
        message="Are you sure you want to delete this job? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmText="Delete"
        confirmColor="error"
        loading={isDeleting}
      />

      {/* Success Snackbar */}
      <SuccessSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        onClose={() => setSnackbarOpen(false)}
      />
    </Container>
  );
};
