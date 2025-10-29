/**
 * SurveyDataTable
 *
 * Displays calculated survey data in a paginated, sortable table.
 */
import React, { useState, useMemo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import type { SurveyPlotData } from '../visualization/types';

interface SurveyDataTableProps {
  surveyData: SurveyPlotData | null;
  isLoading: boolean;
  error: Error | null;
  dataSource: 'calculated' | 'interpolated';
}

type SortableColumn = 'md' | 'inc' | 'azi' | 'northing' | 'easting' | 'tvd' | 'dls' | 'vertical_section' | 'closure_distance' | 'closure_direction';
type SortOrder = 'asc' | 'desc';

export const SurveyDataTable: React.FC<SurveyDataTableProps> = ({
  surveyData,
  isLoading,
  error,
  dataSource
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [orderBy, setOrderBy] = useState<SortableColumn>('md');
  const [order, setOrder] = useState<SortOrder>('asc');

  // Handle sort
  const handleSort = (column: SortableColumn) => {
    const isAsc = orderBy === column && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(column);
  };

  // Prepare table data
  const tableData = useMemo(() => {
    if (!surveyData) return [];

    const rows = surveyData.md.map((md, index) => ({
      index,
      md: md,
      inc: surveyData.inc[index],
      azi: surveyData.azi[index],
      northing: surveyData.northing[index],
      easting: surveyData.easting[index],
      tvd: surveyData.tvd[index],
      dls: surveyData.dls?.[index] ?? 0,
      vertical_section: surveyData.vertical_section?.[index] ?? 0,
      closure_distance: surveyData.closure_distance?.[index] ?? 0,
      closure_direction: surveyData.closure_direction?.[index] ?? 0,
    }));

    // Sort
    const sortedRows = [...rows].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return sortedRows;
  }, [surveyData, order, orderBy]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return tableData.slice(startIndex, startIndex + rowsPerPage);
  }, [tableData, page, rowsPerPage]);

  // Handle page change
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setRowsPerPage(value === '-1' ? tableData.length : parseInt(value, 10));
    setPage(0);
  };

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error">
        {error.message}
      </Alert>
    );
  }

  // No data
  if (!surveyData || tableData.length === 0) {
    return (
      <Alert severity="info">
        No survey data available
      </Alert>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Table Header */}
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Survey Data Table
        </Typography>
        <Chip
          label={`${dataSource === 'calculated' ? 'Calculated' : 'Interpolated'} Data`}
          color={dataSource === 'calculated' ? 'primary' : 'secondary'}
          size="small"
        />
      </Box>

      {/* Table */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                #
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                <TableSortLabel
                  active={orderBy === 'md'}
                  direction={orderBy === 'md' ? order : 'asc'}
                  onClick={() => handleSort('md')}
                >
                  MD (m)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                <TableSortLabel
                  active={orderBy === 'inc'}
                  direction={orderBy === 'inc' ? order : 'asc'}
                  onClick={() => handleSort('inc')}
                >
                  Inc (°)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                <TableSortLabel
                  active={orderBy === 'azi'}
                  direction={orderBy === 'azi' ? order : 'asc'}
                  onClick={() => handleSort('azi')}
                >
                  Azi (°)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                <TableSortLabel
                  active={orderBy === 'northing'}
                  direction={orderBy === 'northing' ? order : 'asc'}
                  onClick={() => handleSort('northing')}
                >
                  Northing (m)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                <TableSortLabel
                  active={orderBy === 'easting'}
                  direction={orderBy === 'easting' ? order : 'asc'}
                  onClick={() => handleSort('easting')}
                >
                  Easting (m)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                <TableSortLabel
                  active={orderBy === 'tvd'}
                  direction={orderBy === 'tvd' ? order : 'asc'}
                  onClick={() => handleSort('tvd')}
                >
                  TVD (m)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                <TableSortLabel
                  active={orderBy === 'vertical_section'}
                  direction={orderBy === 'vertical_section' ? order : 'asc'}
                  onClick={() => handleSort('vertical_section')}
                >
                  Vertical Section (m)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                <TableSortLabel
                  active={orderBy === 'dls'}
                  direction={orderBy === 'dls' ? order : 'asc'}
                  onClick={() => handleSort('dls')}
                >
                  DLS (°/30m)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                <TableSortLabel
                  active={orderBy === 'closure_distance'}
                  direction={orderBy === 'closure_distance' ? order : 'asc'}
                  onClick={() => handleSort('closure_distance')}
                >
                  Closure Distance (m)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                <TableSortLabel
                  active={orderBy === 'closure_direction'}
                  direction={orderBy === 'closure_direction' ? order : 'asc'}
                  onClick={() => handleSort('closure_direction')}
                >
                  Closure Direction (°)
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row) => (
              <TableRow
                key={row.index}
                hover
                sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' } }}
              >
                <TableCell align="center" sx={{ color: 'text.secondary' }}>
                  {row.index + 1}
                </TableCell>
                <TableCell align="right">{row.md?.toFixed(2) ?? 'N/A'}</TableCell>
                <TableCell align="right">{row.inc?.toFixed(2) ?? 'N/A'}</TableCell>
                <TableCell align="right">{row.azi?.toFixed(2) ?? 'N/A'}</TableCell>
                <TableCell align="right">{row.northing?.toFixed(3) ?? 'N/A'}</TableCell>
                <TableCell align="right">{row.easting?.toFixed(3) ?? 'N/A'}</TableCell>
                <TableCell align="right">{row.tvd?.toFixed(2) ?? 'N/A'}</TableCell>
                <TableCell align="right">{row.vertical_section?.toFixed(2) ?? 'N/A'}</TableCell>
                <TableCell align="right">{row.dls?.toFixed(2) ?? 'N/A'}</TableCell>
                <TableCell align="right">{row.closure_distance?.toFixed(2) ?? 'N/A'}</TableCell>
                <TableCell align="right">{row.closure_direction?.toFixed(2) ?? 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100, { label: 'All', value: -1 }]}
        component="div"
        count={tableData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};
