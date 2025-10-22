/**
 * DuplicateSurveyPage Component
 *
 * Displays duplicate survey calculation results (forward, inverse, comparison).
 * Results are NOT saved to database, but can be downloaded as Excel.
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import duplicateSurveyService, { type DuplicateSurveyData } from '../../services/duplicateSurveyService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`duplicate-survey-tabpanel-${index}`}
      aria-labelledby={`duplicate-survey-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const DuplicateSurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const { runId } = useParams<{ runId: string }>();
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get('surveyId');

  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [duplicateData, setDuplicateData] = useState<DuplicateSurveyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Table state
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    const calculateDuplicateSurvey = async () => {
      if (!surveyId) {
        setError('Survey ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Calculate duplicate survey with default interpolation step (10m)
        const data = await duplicateSurveyService.calculateDuplicateSurvey({
          survey_data_id: surveyId,
          interpolation_step: 10.0,
        });

        setDuplicateData(data);
      } catch (err: any) {
        console.error('Failed to calculate duplicate survey:', err);
        setError(err.response?.data?.error || err.message || 'Failed to calculate duplicate survey');
      } finally {
        setIsLoading(false);
      }
    };

    calculateDuplicateSurvey();
  }, [surveyId]);

  const handleBack = () => {
    navigate(`/runs/${runId}`);
  };

  const handleDownloadExcel = async () => {
    if (!surveyId || !duplicateData) return;

    try {
      setIsDownloading(true);
      await duplicateSurveyService.downloadExcel(
        {
          survey_data_id: surveyId,
          interpolation_step: duplicateData.interpolation_step,
        },
        `duplicate_survey_${duplicateData.survey_file_name}.xlsx`
      );
    } catch (err: any) {
      console.error('Failed to download Excel:', err);
      alert('Failed to download Excel file');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0); // Reset pagination when changing tabs
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !duplicateData) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 3 }}>
          Back to Run
        </Button>
        <Alert severity="error">{error || 'No data available'}</Alert>
      </Container>
    );
  }

  // Prepare table data with null checks
  const forwardData = (duplicateData?.forward_md || []).map((_, i) => ({
    md: duplicateData.forward_md[i] ?? 0,
    inc: duplicateData.forward_inc[i] ?? 0,
    azi: duplicateData.forward_azi[i] ?? 0,
    north: duplicateData.forward_north[i] ?? 0,
    east: duplicateData.forward_east[i] ?? 0,
    tvd: duplicateData.forward_tvd[i] ?? 0,
  }));

  const inverseData = (duplicateData?.forward_md || []).map((_, i) => ({
    md: duplicateData.forward_md[i] ?? 0,
    inc: duplicateData.inverse_inc[i] ?? 0,
    azi: duplicateData.inverse_azi[i] ?? 0,
    north: duplicateData.inverse_north[i] ?? 0,
    east: duplicateData.inverse_east[i] ?? 0,
    tvd: duplicateData.inverse_tvd[i] ?? 0,
  }));

  const comparisonData = (duplicateData?.forward_md || []).map((_, i) => ({
    md: duplicateData.forward_md[i] ?? 0,
    delta_inc: duplicateData.delta_inc?.[i] ?? 0,
    delta_azi: duplicateData.delta_azi?.[i] ?? 0,
    delta_north: duplicateData.delta_north?.[i] ?? 0,
    delta_east: duplicateData.delta_east?.[i] ?? 0,
    delta_tvd: duplicateData.delta_tvd?.[i] ?? 0,
    limit_north: duplicateData.limit_north?.[i] ?? 0,
    limit_east: duplicateData.limit_east?.[i] ?? 0,
    limit_tvd: duplicateData.limit_tvd?.[i] ?? 0,
  }));

  const currentData = tabValue === 0 ? forwardData : tabValue === 1 ? inverseData : comparisonData;
  const paginatedData = currentData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
            Back to Run
          </Button>
          <Typography variant="h4" gutterBottom>
            Duplicate Survey Calculation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {duplicateData.survey_file_name}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadExcel}
          disabled={isDownloading}
        >
          {isDownloading ? 'Downloading...' : 'Download Excel'}
        </Button>
      </Box>

      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
        This calculation is NOT saved to the database. Download the Excel file to keep the results.
      </Alert>

      {/* Summary Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Points
              </Typography>
              <Typography variant="h5">{duplicateData.point_count ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Max Δ INC
              </Typography>
              <Typography variant="h5">{(duplicateData.max_delta_inc ?? 0).toFixed(3)}°</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Max Δ AZI
              </Typography>
              <Typography variant="h5">{(duplicateData.max_delta_azi ?? 0).toFixed(3)}°</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Max Δ North
              </Typography>
              <Typography variant="h5">{(duplicateData.max_delta_north ?? 0).toFixed(3)}m</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Max Δ East
              </Typography>
              <Typography variant="h5">{(duplicateData.max_delta_east ?? 0).toFixed(3)}m</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Max Δ TVD
              </Typography>
              <Typography variant="h5">{(duplicateData.max_delta_tvd ?? 0).toFixed(3)}m</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Processing Time */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Processing Time
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Forward Calculation: <strong>{(duplicateData.forward_calculation_time ?? 0).toFixed(3)}s</strong>
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Inverse Calculation: <strong>{(duplicateData.inverse_calculation_time ?? 0).toFixed(3)}s</strong>
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Total Time: <strong>{(duplicateData.total_calculation_time ?? 0).toFixed(3)}s</strong>
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Tables */}
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Forward Results" />
          <Tab label="Inverse Results" />
          <Tab label="Comparison" />
        </Tabs>

        <Divider />

        {/* Forward Results Table */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>MD (m)</TableCell>
                  <TableCell align="right">INC (deg)</TableCell>
                  <TableCell align="right">AZI (deg)</TableCell>
                  <TableCell align="right">North (m)</TableCell>
                  <TableCell align="right">East (m)</TableCell>
                  <TableCell align="right">TVD (m)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((row: any, index) => (
                  <TableRow key={index}>
                    <TableCell>{(row?.md ?? 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{(row?.inc ?? 0).toFixed(4)}</TableCell>
                    <TableCell align="right">{(row?.azi ?? 0).toFixed(4)}</TableCell>
                    <TableCell align="right">{(row?.north ?? 0).toFixed(4)}</TableCell>
                    <TableCell align="right">{(row?.east ?? 0).toFixed(4)}</TableCell>
                    <TableCell align="right">{(row?.tvd ?? 0).toFixed(4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Inverse Results Table */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>MD (m)</TableCell>
                  <TableCell align="right">INC (deg)</TableCell>
                  <TableCell align="right">AZI (deg)</TableCell>
                  <TableCell align="right">North (m)</TableCell>
                  <TableCell align="right">East (m)</TableCell>
                  <TableCell align="right">TVD (m)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((row: any, index) => (
                  <TableRow key={index}>
                    <TableCell>{(row?.md ?? 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{(row?.inc ?? 0).toFixed(4)}</TableCell>
                    <TableCell align="right">{(row?.azi ?? 0).toFixed(4)}</TableCell>
                    <TableCell align="right">{(row?.north ?? 0).toFixed(4)}</TableCell>
                    <TableCell align="right">{(row?.east ?? 0).toFixed(4)}</TableCell>
                    <TableCell align="right">{(row?.tvd ?? 0).toFixed(4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Comparison Table */}
        <TabPanel value={tabValue} index={2}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>MD (m)</TableCell>
                  <TableCell align="right">Δ INC (deg)</TableCell>
                  <TableCell align="right">Δ AZI (deg)</TableCell>
                  <TableCell align="right">Δ North (m)</TableCell>
                  <TableCell align="right">Δ East (m)</TableCell>
                  <TableCell align="right">Δ TVD (m)</TableCell>
                  <TableCell align="right">Limit N</TableCell>
                  <TableCell align="right">Limit E</TableCell>
                  <TableCell align="right">Limit TVD</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((row: any, index) => (
                  <TableRow key={index}>
                    <TableCell>{(row?.md ?? 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{(row?.delta_inc ?? 0).toFixed(6)}</TableCell>
                    <TableCell align="right">{(row?.delta_azi ?? 0).toFixed(6)}</TableCell>
                    <TableCell align="right">{(row?.delta_north ?? 0).toFixed(6)}</TableCell>
                    <TableCell align="right">{(row?.delta_east ?? 0).toFixed(6)}</TableCell>
                    <TableCell align="right">{(row?.delta_tvd ?? 0).toFixed(6)}</TableCell>
                    <TableCell align="right">{(row?.limit_north ?? 0).toFixed(8)}</TableCell>
                    <TableCell align="right">{(row?.limit_east ?? 0).toFixed(8)}</TableCell>
                    <TableCell align="right">{(row?.limit_tvd ?? 0).toFixed(8)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={currentData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Container>
  );
};
