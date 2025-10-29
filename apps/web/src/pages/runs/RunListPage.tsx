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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SuccessSnackbar } from '../../components/common/SuccessSnackbar';
import { useGetRunsQuery, useDeleteRunMutation } from '../../stores/runsSlice';
import type { SurveyType, RunType, RunFilters } from '../../types/run.types';

/**
 * RunListPage Component
 * Displays paginated list of runs with filtering, search, and actions
 * Based on Story 2.4 AC#1
 */
export const RunListPage: React.FC = () => {
  const navigate = useNavigate();

  // Filters state
  const [filters, setFilters] = useState<RunFilters>({
    page: 1,
    page_size: 20,
    ordering: '-created_at',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [runToDelete, setRunToDelete] = useState<string | null>(null);

  // Success snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetch runs with current filters
  const { data, isLoading, error, refetch } = useGetRunsQuery(filters);
  const [deleteRun, { isLoading: isDeleting }] = useDeleteRunMutation();

  // All authenticated users have full access (read, write, delete)
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
  const handleFilterChange = (field: keyof RunFilters, value: any) => {
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
      page: newPage + 1, // MUI uses 0-indexed pages
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
    setRunToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!runToDelete) return;

    try {
      await deleteRun(runToDelete).unwrap();
      setSnackbarMessage('Run deleted successfully');
      setSnackbarOpen(true);
      setDeleteDialogOpen(false);
      setRunToDelete(null);
    } catch (error) {
      console.error('Failed to delete run:', error);
    }
  };

  // Get run type color
  const getRunTypeColor = (type: SurveyType) => {
    const colors: Record<SurveyType, 'primary' | 'secondary' | 'success' | 'default'> = {
      GTL: 'primary',
      Gyro: 'secondary',
      MWD: 'success',
      Unknown: 'default',
    };
    return colors[type] || 'default';
  };

  return (
    <Container maxWidth="xl">
      <PageHeader
        title="Runs"
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Runs' },
        ]}
        actions={
          canEdit ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/runs/new/complete')}
            >
              Create Run
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <TextField
            label="Search"
            placeholder="Search by run number or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ minWidth: 250 }}
            size="small"
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Run Type</InputLabel>
            <Select
              value={filters.run_type || ''}
              onChange={(e) => handleFilterChange('run_type', e.target.value as RunType)}
              label="Run Type"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="GTL">GTL</MenuItem>
              <MenuItem value="Gyro">Gyro</MenuItem>
              <MenuItem value="MWD">MWD</MenuItem>
              <MenuItem value="Unknown">Unknown</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={filters.ordering || '-created_at'}
              onChange={(e) => handleFilterChange('ordering', e.target.value)}
              label="Sort By"
            >
              <MenuItem value="-created_at">Newest First</MenuItem>
              <MenuItem value="created_at">Oldest First</MenuItem>
              <MenuItem value="run_number">Run Number (A-Z)</MenuItem>
              <MenuItem value="-run_number">Run Number (Z-A)</MenuItem>
            </Select>
          </FormControl>

          <Button variant="outlined" onClick={handleSearch}>
            Apply Filters
          </Button>

          <Button
            variant="text"
            onClick={() => {
              setFilters({ page: 1, page_size: 20, ordering: '-created_at' });
              setSearchTerm('');
            }}
          >
            Clear
          </Button>
        </Box>
      </Paper>

      {/* Table */}
      {error && (
        <ErrorAlert error={error as Error} onRetry={refetch} />
      )}

      {isLoading ? (
        <SkeletonLoader rows={10} variant="table" />
      ) : data?.results && data.results.length > 0 ? (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Run Number</TableCell>
                  <TableCell>Run Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Well</TableCell>
                  <TableCell align="center">Surveys</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.results.map((run) => (
                  <TableRow key={run.id} hover>
                    <TableCell>{run.run_number}</TableCell>
                    <TableCell>{run.run_name}</TableCell>
                    <TableCell>
                      <Chip
                        label={run.survey_type}
                        color={getRunTypeColor(run.survey_type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {run.well ? run.well.well_name : '-'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={run.survey_files_count || 0}
                        color={run.survey_files_count ? 'primary' : 'default'}
                        size="small"
                        variant={run.survey_files_count ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(run.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{run.user.username}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/runs/${run.id}`)}
                        title="View details"
                      >
                        <ViewIcon />
                      </IconButton>
                      {canEdit && (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/runs/${run.id}/edit`)}
                            title="Edit run"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(run.id)}
                            title="Delete run"
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Box>No runs found</Box>
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/runs/new/complete')}
              sx={{ mt: 2 }}
            >
              Create First Run
            </Button>
          )}
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Run"
        message="Are you sure you want to delete this run? This action will soft delete the run and it can be recovered later."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setRunToDelete(null);
        }}
        loading={isDeleting}
        severity="error"
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
