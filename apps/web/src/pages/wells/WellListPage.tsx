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
import { useGetWellsQuery, useDeleteWellMutation } from '../../stores/wellsSlice';
import type { WellType, WellFilters } from '../../types/well.types';

/**
 * WellListPage Component
 * Displays paginated list of wells with filtering, search, and actions
 * Based on Story 2.5 AC#1
 */
export const WellListPage: React.FC = () => {
  const navigate = useNavigate();

  // Filters state
  const [filters, setFilters] = useState<WellFilters>({
    page: 1,
    page_size: 20,
    ordering: '-created_at',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [wellToDelete, setWellToDelete] = useState<string | null>(null);

  // Success snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetch wells with current filters
  const { data, isLoading, error, refetch } = useGetWellsQuery(filters);
  const [deleteWell, { isLoading: isDeleting }] = useDeleteWellMutation();

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
  const handleFilterChange = (field: keyof WellFilters, value: any) => {
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
    setFilters((prev) => ({
      ...prev,
      page_size: parseInt(event.target.value, 10),
      page: 1,
    }));
  };

  // Handle delete
  const handleDeleteClick = (id: string) => {
    setWellToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!wellToDelete) return;

    try {
      await deleteWell(wellToDelete).unwrap();
      setSnackbarMessage('Well deleted successfully');
      setSnackbarOpen(true);
      setDeleteDialogOpen(false);
      setWellToDelete(null);
    } catch (error) {
      console.error('Failed to delete well:', error);
    }
  };

  // Get well type color
  const getWellTypeColor = (type: WellType) => {
    const colors: Record<WellType, 'primary' | 'secondary' | 'success' | 'default'> = {
      Oil: 'primary',
      Gas: 'secondary',
      Water: 'success',
      Other: 'default',
    };
    return colors[type] || 'default';
  };

  return (
    <Container maxWidth="xl">
      <PageHeader
        title="Wells"
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Wells' },
        ]}
        actions={
          canEdit ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/wells/new')}
            >
              Create Well
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <TextField
            label="Search"
            placeholder="Search by well name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ minWidth: 250 }}
            size="small"
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Well Type</InputLabel>
            <Select
              value={filters.well_type || ''}
              onChange={(e) => handleFilterChange('well_type', e.target.value as WellType)}
              label="Well Type"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Oil">Oil</MenuItem>
              <MenuItem value="Gas">Gas</MenuItem>
              <MenuItem value="Water">Water</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
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
              <MenuItem value="well_name">Well Name (A-Z)</MenuItem>
              <MenuItem value="-well_name">Well Name (Z-A)</MenuItem>
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
                  <TableCell>Well Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Runs Count</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Updated At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.results.map((well) => (
                  <TableRow key={well.id} hover>
                    <TableCell>{well.well_name}</TableCell>
                    <TableCell>
                      <Chip
                        label={well.well_type}
                        color={getWellTypeColor(well.well_type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{well.runs_count}</TableCell>
                    <TableCell>
                      {format(new Date(well.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(well.updated_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/wells/${well.id}`)}
                        title="View details"
                      >
                        <ViewIcon />
                      </IconButton>
                      {canEdit && (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/wells/${well.id}/edit`)}
                            title="Edit well"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(well.id)}
                            title="Delete well"
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
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </Paper>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Box>No wells found</Box>
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/wells/new')}
              sx={{ mt: 2 }}
            >
              Create First Well
            </Button>
          )}
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Well"
        message="Are you sure you want to delete this well? This action will set the well field to NULL for all associated runs."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setWellToDelete(null);
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
