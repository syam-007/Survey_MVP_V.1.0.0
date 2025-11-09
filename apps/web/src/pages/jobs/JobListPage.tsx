import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Container,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SuccessSnackbar } from '../../components/common/SuccessSnackbar';
import { useGetJobsQuery, useDeleteJobMutation } from '../../stores/jobsSlice';
import type { JobStatus, JobFilters } from '../../types/job.types';

/**
 * JobListPage Component
 * Landing page displaying all jobs with filtering, search, and actions
 */
export const JobListPage: React.FC = () => {
  const navigate = useNavigate();

  // Filters state
  const [filters, setFilters] = useState<JobFilters>({
    page: 1,
    page_size: 20,
    ordering: '-created_at',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  // Success snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetch jobs with current filters
  const { data, isLoading, error, refetch } = useGetJobsQuery(filters);
  const [deleteJob, { isLoading: isDeleting }] = useDeleteJobMutation();

  // All authenticated users have full access
  const canEdit = true;

  // Handle search
  const handleSearch = () => {
    setFilters((prev) => ({
      ...prev,
      search: searchTerm || undefined,
      page: 1,
    }));
  };

  // Handle filter change
  const handleFilterChange = (field: keyof JobFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value || undefined,
      page: 1,
    }));
  };

  // Handle page change
  const handlePageChange = (_event: unknown, newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage + 1,
    }));
  };

  // Handle page size change
  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFilters((prev) => ({
      ...prev,
      page_size: value === '-1' ? data?.count || 1000 : parseInt(value, 10),
      page: 1,
    }));
  };

  // Handle delete
  const handleDeleteClick = (id: string) => {
    setJobToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;

    try {
      await deleteJob(jobToDelete).unwrap();
      setSnackbarMessage('Job deleted successfully');
      setSnackbarOpen(true);
      setDeleteDialogOpen(false);
      setJobToDelete(null);
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

  return (
    <Container maxWidth="xl">
      <PageHeader
        title="Jobs"
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Jobs' },
        ]}
        actions={
          canEdit ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/jobs/new')}
            >
              Create Job
            </Button>
          ) : undefined
        }
      />

      {/* Filters Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Search jobs by number, name, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={handleSearch} size="small">
                    <SearchIcon />
                  </IconButton>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="planned">Planned</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={filters.ordering || '-created_at'}
                onChange={(e) => handleFilterChange('ordering', e.target.value)}
                label="Sort By"
              >
                <MenuItem value="-created_at">Newest First</MenuItem>
                <MenuItem value="created_at">Oldest First</MenuItem>
                <MenuItem value="job_number">Job Number</MenuItem>
                <MenuItem value="job_name">Job Name</MenuItem>
                <MenuItem value="status">Status</MenuItem>
                <MenuItem value="-start_date">Start Date (Newest)</MenuItem>
                <MenuItem value="start_date">Start Date (Oldest)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {filters.search && (
            <Grid item xs={12} sm={6} md={2}>
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  handleFilterChange('search', '');
                }}
              >
                Clear Search
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Loading State */}
      {isLoading && <SkeletonLoader count={5} height={60} />}

      {/* Error State */}
      {error && (
        <ErrorAlert
          error="Failed to load jobs. Please try again."
          onRetry={refetch}
        />
      )}

      {/* Jobs Table */}
      {!isLoading && !error && data && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Job Number</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Well</TableCell>
                  {/* <TableCell>Status</TableCell> */}
                  <TableCell>Runs</TableCell>
                  {/* <TableCell>Start Date</TableCell> */}
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      No jobs found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.results.map((job) => (
                    <TableRow key={job.id} hover>
                      <TableCell>{job.job_number}</TableCell>
                      <TableCell>{job.customer_name}</TableCell>
                      <TableCell>{job.client_name}</TableCell>
                      <TableCell>{job.well_name}</TableCell>
                      {/* <TableCell>
                        <Chip
                          label={job.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(job.status)}
                          size="small"
                        />
                      </TableCell> */}
                      <TableCell>
                        <Chip label={job.run_count} size="small" variant="outlined" />
                      </TableCell>
                      {/* <TableCell>
                        {job.start_date
                          ? format(new Date(job.start_date), 'MMM dd, yyyy')
                          : '-'}
                      </TableCell> */}
                      <TableCell>
                        {format(new Date(job.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          title="View Details"
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        {canEdit && (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/jobs/${job.id}/edit`)}
                              title="Edit Job"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(job.id)}
                              title="Delete Job"
                              disabled={job.run_count > 0}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={data.count}
            page={(filters.page || 1) - 1}
            onPageChange={handlePageChange}
            rowsPerPage={filters.page_size || 20}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 20, 50, 100, { label: 'All', value: -1 }]}
          />
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Job"
        message="Are you sure you want to delete this job? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setJobToDelete(null);
        }}
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
