/**
 * ComparisonDataTable Component
 *
 * Displays comparison results in a tabular format with pagination and sorting.
 */
import React, { useState, useMemo } from 'react';
import {
  Box,
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
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Stack,
  Button,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import type { ComparisonResult } from '../../types/comparison.types';

interface ComparisonDataTableProps {
  comparison: ComparisonResult;
  onExport?: (format: 'csv' | 'excel') => void;
  onSave?: () => void;
}

type SortColumn =
  | 'md'
  | 'delta_inc'
  | 'delta_azi'
  | 'delta_x'
  | 'delta_y'
  | 'delta_z'
  | 'delta_horizontal'
  | 'delta_total';

type SortDirection = 'asc' | 'desc';

interface TableRow {
  md: number;
  // Reference survey data
  inc_ref: number;
  azi_ref: number;
  north_ref: number;
  east_ref: number;
  tvd_ref: number;
  // Comparative survey data
  inc_cmp: number;
  azi_cmp: number;
  north_cmp: number;
  east_cmp: number;
  tvd_cmp: number;
  // Delta values
  delta_inc: number;
  delta_azi: number;
  delta_n: number;
  delta_e: number;
  delta_tvd: number;
  displacement: number;
}

export const ComparisonDataTable: React.FC<ComparisonDataTableProps> = ({
  comparison,
  onExport,
  onSave,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<SortColumn>('md');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // Prepare table data - matching Streamlit output structure
  const tableData: TableRow[] = useMemo(() => {
    const data: TableRow[] = [];

    // Check if new survey coordinate fields are available
    const hasNewFields = comparison.reference_inc && comparison.comparison_inc;

    if (!hasNewFields) {
      console.warn('Comparison data missing survey coordinates. This comparison was created before the migration. Please create a new comparison to see full survey data.');
    }

    // Use full survey data from backend (available after migration)
    for (let i = 0; i < comparison.md_data.length; i++) {
      data.push({
        md: comparison.md_data[i],
        // Reference survey (from backend)
        inc_ref: comparison.reference_inc?.[i] ?? 0,
        azi_ref: comparison.reference_azi?.[i] ?? 0,
        north_ref: comparison.reference_northing?.[i] ?? 0,
        east_ref: comparison.reference_easting?.[i] ?? 0,
        tvd_ref: comparison.reference_tvd?.[i] ?? 0,
        // Comparative survey (from backend)
        inc_cmp: comparison.comparison_inc?.[i] ?? 0,
        azi_cmp: comparison.comparison_azi?.[i] ?? 0,
        north_cmp: comparison.comparison_northing?.[i] ?? 0,
        east_cmp: comparison.comparison_easting?.[i] ?? 0,
        tvd_cmp: comparison.comparison_tvd?.[i] ?? 0,
        // Deltas
        delta_inc: comparison.delta_inc[i],
        delta_azi: comparison.delta_azi[i],
        delta_n: comparison.delta_y[i],
        delta_e: comparison.delta_x[i],
        delta_tvd: comparison.delta_z[i],
        displacement: comparison.delta_total[i],
      });
    }
    return data;
  }, [comparison]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = tableData;

    // Apply search filter (search by MD)
    if (searchTerm) {
      const searchValue = parseFloat(searchTerm);
      if (!isNaN(searchValue)) {
        filtered = filtered.filter((row) =>
          row.md.toString().includes(searchTerm)
        );
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return filtered;
  }, [tableData, searchTerm, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredAndSortedData.slice(start, end);
  }, [filteredAndSortedData, page, rowsPerPage]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (column: SortColumn) => {
    const isAsc = sortColumn === column && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortColumn(column);
  };

  // Color code cells based on magnitude
  const getCellColor = (value: number, maxValue: number): string => {
    const absValue = Math.abs(value);
    const ratio = absValue / maxValue;

    if (ratio < 0.3) {
      return 'success.light';
    } else if (ratio < 0.7) {
      return 'warning.light';
    } else {
      return 'error.light';
    }
  };

  return (
    <Paper elevation={2}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Comparison Data Table</Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              onClick={onSave}
              color="primary"
            >
              Save to Database
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => onExport?.('csv')}
            >
              CSV
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => onExport?.('excel')}
            >
              Excel
            </Button>
          </Stack>
        </Stack>

        {/* Search and Filter Controls */}
        <Stack direction="row" spacing={2} mb={2}>
          <TextField
            size="small"
            placeholder="Search by MD..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0); // Reset to first page when searching
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <Chip
            label={`${filteredAndSortedData.length} of ${tableData.length} points`}
            color="primary"
            size="small"
          />
        </Stack>

        {/* Table - Matching Streamlit output structure */}
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {/* MD Column */}
                <TableCell sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortColumn === 'md'}
                    direction={sortColumn === 'md' ? sortDirection : 'asc'}
                    onClick={() => handleSort('md')}
                    sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    MD
                  </TableSortLabel>
                </TableCell>

                {/* Reference Survey Columns */}
                <TableCell align="right" sx={{ bgcolor: 'info.light', fontWeight: 'bold' }}>INC_ref</TableCell>
                <TableCell align="right" sx={{ bgcolor: 'info.light', fontWeight: 'bold' }}>AZI_ref</TableCell>
                <TableCell align="right" sx={{ bgcolor: 'info.light', fontWeight: 'bold' }}>North_ref</TableCell>
                <TableCell align="right" sx={{ bgcolor: 'info.light', fontWeight: 'bold' }}>East_ref</TableCell>
                <TableCell align="right" sx={{ bgcolor: 'info.light', fontWeight: 'bold' }}>TVD_ref</TableCell>

                {/* Comparative Survey Columns */}
                <TableCell align="right" sx={{ bgcolor: 'warning.light', fontWeight: 'bold' }}>INC_cmp</TableCell>
                <TableCell align="right" sx={{ bgcolor: 'warning.light', fontWeight: 'bold' }}>AZI_cmp</TableCell>
                <TableCell align="right" sx={{ bgcolor: 'warning.light', fontWeight: 'bold' }}>North_cmp</TableCell>
                <TableCell align="right" sx={{ bgcolor: 'warning.light', fontWeight: 'bold' }}>East_cmp</TableCell>
                <TableCell align="right" sx={{ bgcolor: 'warning.light', fontWeight: 'bold' }}>TVD_cmp</TableCell>

                {/* Delta Columns */}
                <TableCell align="right" sx={{ bgcolor: 'success.light', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortColumn === 'delta_inc'}
                    direction={sortColumn === 'delta_inc' ? sortDirection : 'asc'}
                    onClick={() => handleSort('delta_inc')}
                  >
                    Delta_INC
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: 'success.light', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortColumn === 'delta_azi'}
                    direction={sortColumn === 'delta_azi' ? sortDirection : 'asc'}
                    onClick={() => handleSort('delta_azi')}
                  >
                    Delta_AZI
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: 'success.light', fontWeight: 'bold' }}>Delta_N</TableCell>
                <TableCell align="right" sx={{ bgcolor: 'success.light', fontWeight: 'bold' }}>Delta_E</TableCell>
                <TableCell align="right" sx={{ bgcolor: 'success.light', fontWeight: 'bold' }}>Delta_TVD</TableCell>
                <TableCell align="right" sx={{ bgcolor: 'error.light', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortColumn === 'delta_total'}
                    direction={sortColumn === 'delta_total' ? sortDirection : 'asc'}
                    onClick={() => handleSort('delta_total')}
                  >
                    Displacement
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.map((row, index) => (
                <TableRow
                  key={index}
                  hover
                  sx={{
                    '&:nth-of-type(odd)': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  {/* MD Column */}
                  <TableCell component="th" scope="row">
                    <strong>{row.md.toFixed(2)}</strong>
                  </TableCell>

                  {/* Reference Survey Columns */}
                  <TableCell align="right">{row.inc_ref.toFixed(2)}</TableCell>
                  <TableCell align="right">{row.azi_ref.toFixed(2)}</TableCell>
                  <TableCell align="right">{row.north_ref.toFixed(3)}</TableCell>
                  <TableCell align="right">{row.east_ref.toFixed(3)}</TableCell>
                  <TableCell align="right">{row.tvd_ref.toFixed(3)}</TableCell>

                  {/* Comparative Survey Columns */}
                  <TableCell align="right">{row.inc_cmp.toFixed(2)}</TableCell>
                  <TableCell align="right">{row.azi_cmp.toFixed(2)}</TableCell>
                  <TableCell align="right">{row.north_cmp.toFixed(3)}</TableCell>
                  <TableCell align="right">{row.east_cmp.toFixed(3)}</TableCell>
                  <TableCell align="right">{row.tvd_cmp.toFixed(3)}</TableCell>

                  {/* Delta Columns with Color Coding */}
                  <TableCell
                    align="right"
                    sx={{
                      bgcolor: getCellColor(
                        row.delta_inc,
                        comparison.statistics.max_delta_inc
                      ),
                    }}
                  >
                    {row.delta_inc.toFixed(3)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      bgcolor: getCellColor(
                        row.delta_azi,
                        comparison.statistics.max_delta_azi
                      ),
                    }}
                  >
                    {row.delta_azi.toFixed(3)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      bgcolor: getCellColor(
                        row.delta_n,
                        Math.max(...comparison.delta_y.map(Math.abs))
                      ),
                    }}
                  >
                    {row.delta_n.toFixed(3)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      bgcolor: getCellColor(
                        row.delta_e,
                        Math.max(...comparison.delta_x.map(Math.abs))
                      ),
                    }}
                  >
                    {row.delta_e.toFixed(3)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      bgcolor: getCellColor(
                        row.delta_tvd,
                        Math.max(...comparison.delta_z.map(Math.abs))
                      ),
                    }}
                  >
                    {row.delta_tvd.toFixed(3)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      bgcolor: getCellColor(
                        row.displacement,
                        comparison.statistics.max_delta_total
                      ),
                    }}
                  >
                    <strong>{row.displacement.toFixed(3)}</strong>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100, { label: 'All', value: -1 }]}
          component="div"
          count={filteredAndSortedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />

        {/* Legend */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Color Legend (based on deviation magnitude):
          </Typography>
          <Stack direction="row" spacing={2} mt={1}>
            <Chip
              label="Low (0-30%)"
              size="small"
              sx={{ bgcolor: 'success.light' }}
            />
            <Chip
              label="Medium (30-70%)"
              size="small"
              sx={{ bgcolor: 'warning.light' }}
            />
            <Chip
              label="High (70-100%)"
              size="small"
              sx={{ bgcolor: 'error.light' }}
            />
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
};
