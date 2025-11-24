/**
 * SurveyResultsPage
 *
 * Displays complete survey results including metadata, calculations, and visualizations.
 * Supports toggling between calculated and interpolated data sources.
 */
import config from '../../config/env';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  Breadcrumbs,
  Link,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  Snackbar
} from '@mui/material';
import { PictureAsPdf as PictureAsPdfIcon, Description as DescriptionIcon } from '@mui/icons-material';
import { Plot2D } from '../../components/visualization/Plot2D';
import { SingleSurveyPlot3D } from '../../components/survey/SingleSurveyPlot3D';
import { DataSourceToggle } from '../../components/visualization/DataSourceToggle';
import { DownloadButton } from '../../components/survey/DownloadButton';
import { SurveyDataTable } from '../../components/survey/SurveyDataTable';
import { InterpolationControls } from '../../components/survey/InterpolationControls';
import { useSurveyPlotData } from '../../hooks/useSurveyPlotData';
import surveysService from '../../services/surveysService';
import qaService from '../../services/qaService';
import type { PlotType } from '../../components/visualization/types';
import { QAResultsSection } from '../../components/survey/QAResultsSection';
import type { QAData } from '../../types/survey.types';

export const SurveyResultsPage: React.FC = () => {
  const { runId, surveyDataId } = useParams<{ runId: string; surveyDataId: string }>();
  const navigate = useNavigate();

  const [dataSource, setDataSource] = useState<'calculated' | 'interpolated'>('calculated');
  const [plotType2D, setPlotType2D] = useState<PlotType>('vertical');
  const [resolution, setResolution] = useState(5);
  const [startMD, setStartMD] = useState<number | undefined>(undefined);
  const [endMD, setEndMD] = useState<number | undefined>(undefined);
  const [calculatedSurveyId, setCalculatedSurveyId] = useState<string | null>(null);

  // Handler for data source changes - reset interpolation params when switching to calculated
  const handleDataSourceChange = (newDataSource: 'calculated' | 'interpolated') => {
    setDataSource(newDataSource);
    // Reset interpolation parameters when switching to calculated to ensure clean state
    if (newDataSource === 'calculated') {
      setStartMD(undefined);
      setEndMD(undefined);
      setResolution(5);
    }
  };
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [isDownloadingServiceTicket, setIsDownloadingServiceTicket] = useState(false);
  const [qaData, setQaData] = useState<QAData | null>(null);
  const [activeTab, setActiveTab] = useState<'qa' | 'survey'>('qa');
  const [isQAApproved, setIsQAApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [tieOnMD, setTieOnMD] = useState<number>(0);
  const [finalMD, setFinalMD] = useState<number>(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const { data: surveyData, metadata, isLoading, error, isSaved, interpolatedSurveyId, refetch } = useSurveyPlotData(
    surveyDataId!,
    dataSource,
    resolution,
    startMD,
    endMD
  );

  // Handler for interpolation parameter changes
  const handleInterpolationChange = (newResolution: number, newStartMD?: number, newEndMD?: number) => {
    setResolution(newResolution);
    setStartMD(newStartMD);
    setEndMD(newEndMD);
  };

  // Extract fetchSurveyDetails so it can be reused
  const fetchSurveyDetails = React.useCallback(async () => {
    if (!surveyDataId) return;

    try {
      const result = await surveysService.getSurveyById(surveyDataId);
      setCalculatedSurveyId(result.id);

      console.log('=== Survey Data Loaded ===');
      console.log('Calculated Survey ID:', result.id);
      console.log('Calculation Status:', result.calculation_status);
      console.log('Survey Data Structure:', result.survey_data);
      console.log('Has md_data?:', result.survey_data?.md_data ? 'Yes' : 'No');
      console.log('md_data length:', result.survey_data?.md_data?.length || 0);
      console.log('md_data array:', result.survey_data?.md_data);
      console.log('QA Data:', (result as any).qa_data);

      // Extract tie-on and final MD from calculated survey data
      if (result.survey_data?.md_data && result.survey_data.md_data.length > 0) {
        const extractedTieOnMD = result.survey_data.md_data[0];
        const extractedFinalMD = result.survey_data.md_data[result.survey_data.md_data.length - 1];

        console.log('✓ Extracted Tie-on MD:', extractedTieOnMD);
        console.log('✓ Extracted Final MD:', extractedFinalMD);

        setTieOnMD(extractedTieOnMD);
        setFinalMD(extractedFinalMD);
      } else {
        console.error('✗ FAILED to extract MD values - survey_data.md_data is missing or empty!');
        console.log('  - survey_data exists?:', !!result.survey_data);
        console.log('  - md_data exists?:', !!result.survey_data?.md_data);
        console.log('  - md_data length:', result.survey_data?.md_data?.length);
      }

      // Check if QA data is available (GTL surveys only)
      if ((result as any).qa_data) {
        const qaData = (result as any).qa_data;
        setQaData(qaData);

        console.log('QA Status:', qaData.status);
        console.log('Is Approved Check:', qaData.status === 'approved', '&&', result.calculation_status === 'calculated');

        // Check if QA is already approved
        // QA is approved if status is 'approved' AND calculations are 'calculated'
        const isApproved = qaData.status === 'approved' && result.calculation_status === 'calculated';
        setIsQAApproved(isApproved);

        console.log('Final isApproved:', isApproved);

        // Set initial tab based on QA status (only on first load)
        if (!qaData || qaData.status !== 'approved') {
          setActiveTab('qa'); // QA pending, show QA tab
        }
      } else {
        // Non-GTL survey or no QA data, show survey detail directly
        setActiveTab('survey');
        setIsQAApproved(true); // No QA needed
      }
    } catch (err) {
      console.error('Failed to fetch survey details:', err);
    }
  }, [surveyDataId]);

  // Fetch calculated survey ID and QA data on mount
  useEffect(() => {
    fetchSurveyDetails();
  }, [fetchSurveyDetails]);

  const handleDownloadReport = async () => {
    if (!surveyDataId) return;

    setIsDownloadingReport(true);

    try {
      // Build URL with query parameters for data source and resolution
      const params = new URLSearchParams({
        data_source: dataSource,
        ...(dataSource === 'interpolated' && { resolution: resolution.toString() })
      });

      const url = `${config.apiBaseUrl}/api/v1/surveys/${surveyDataId}/report/?${params}`;

      // Fetch the PDF file
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `survey_report_${surveyDataId}.pdf`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const handleDownloadServiceTicket = async () => {
    if (!runId) return;

    setIsDownloadingServiceTicket(true);

    try {
      const url = `${config.apiBaseUrl}/api/v1/runs/${runId}/service_ticket/`;

      // Fetch the PDF file
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate service ticket');
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `Service_Ticket_${runId}.pdf`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(downloadUrl);

      // Show success message
      setSnackbarMessage('Service ticket downloaded successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to download service ticket:', error);
      setSnackbarMessage('Failed to download service ticket. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsDownloadingServiceTicket(false);
    }
  };

  const handleApproveQA = async (indicesToKeep?: number[]) => {
    if (!surveyDataId) return;

    setIsApproving(true);

    try {
      await qaService.approveQA(surveyDataId, indicesToKeep);

      // Update state to reflect approval
      setIsQAApproved(true);

      // Refetch survey details to get updated QA data
      await fetchSurveyDetails();

      // Refetch survey plot data to get calculation results
      await refetch();

      // Switch to Survey Detail tab to show calculations
      setActiveTab('survey');
    } catch (error) {
      console.error('Failed to approve QA:', error);
      alert('Failed to approve QA and calculate survey. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  if (!runId || !surveyDataId) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">Invalid survey ID or run ID</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('/runs');
          }}
        >
          Runs
        </Link>
        <Link
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate(`/runs/${runId}`);
          }}
        >
          Run Details
        </Link>
        <Typography color="text.primary">Survey Results</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Typography variant="h4" gutterBottom>
        Survey Results
      </Typography>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error.message}
        </Alert>
      )}

      {/* File Metadata */}
      {metadata && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            File Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Filename
              </Typography>
              <Typography variant="body1">
                {metadata.filename}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Upload Date
              </Typography>
              <Typography variant="body1">
                {metadata.uploadDate}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Data Points ({dataSource})
              </Typography>
              <Typography variant="body1">
                {dataSource === 'calculated' ? metadata.calculatedCount : metadata.interpolatedCount}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Processing Time
              </Typography>
              <Typography variant="body1">
                {metadata.processingDuration}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Tabs Section */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {qaData && (
            <Tab
              label="QA Results"
              value="qa"
            />
          )}
          <Tab
            label="Survey Detail"
            value="survey"
            disabled={qaData && !isQAApproved}
          />
        </Tabs>

        {/* QA Tab Content */}
        {activeTab === 'qa' && qaData && (
          <Box sx={{ p: 3 }}>
            <QAResultsSection
              qaData={qaData}
              onApprove={handleApproveQA}
              isApproved={isQAApproved}
              isApproving={isApproving}
            />
          </Box>
        )}

        {/* Survey Detail Tab Content */}
        {activeTab === 'survey' && (
          <Box sx={{ p: 3 }}>
            {/* Interpolation Controls - Only show when viewing interpolated data */}
            {dataSource === 'interpolated' && calculatedSurveyId && finalMD > tieOnMD && (
              <InterpolationControls
                calculatedSurveyId={calculatedSurveyId}
                currentResolution={resolution}
                isSaved={isSaved}
                tieOnMD={tieOnMD}
                finalMD={finalMD}
                onResolutionChange={handleInterpolationChange}
                onInterpolationComplete={refetch}
              />
            )}

            {/* Data Source Toggle and Download Buttons */}
            {metadata && (
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <DataSourceToggle
                  value={dataSource}
                  onChange={handleDataSourceChange}
                  calculatedCount={metadata.calculatedCount}
                  interpolatedCount={metadata.interpolatedCount}
                />

                {/* Download Buttons */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={isDownloadingReport ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdfIcon />}
                    onClick={handleDownloadReport}
                    disabled={isDownloadingReport}
                  >
                    {isDownloadingReport ? 'Generating...' : 'Download Report'}
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={isDownloadingServiceTicket ? <CircularProgress size={20} color="inherit" /> : <DescriptionIcon />}
                    onClick={handleDownloadServiceTicket}
                    disabled={isDownloadingServiceTicket}
                  >
                    {isDownloadingServiceTicket ? 'Generating...' : 'Service Ticket'}
                  </Button>
                  {calculatedSurveyId && (
                    <DownloadButton surveyId={calculatedSurveyId} dataType="calculated" />
                  )}
                  {dataSource === 'interpolated' && interpolatedSurveyId && (
                    <DownloadButton surveyId={interpolatedSurveyId} dataType="interpolated" />
                  )}
                </Box>
              </Box>
            )}

            <Divider sx={{ mb: 3 }} />

            {/* Survey Data Table - Full Width */}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <SurveyDataTable
                  surveyData={surveyData}
                  isLoading={isLoading}
                  error={error}
                  dataSource={dataSource}
                />
              </Grid>
            </Grid>

            {/* Visualization Section: 3D and 2D Side by Side */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Left Column: 3D Visualization */}
              <Grid item xs={12} lg={6}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    3D Trajectory Visualization
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Interactive 3D view showing Easting, Northing, and TVD. Use your mouse to rotate, zoom, and pan.
                  </Typography>
                  <SingleSurveyPlot3D
                    surveyData={surveyData}
                    isLoading={isLoading}
                    error={error}
                    title={metadata?.filename || 'Survey'}
                    color="#F44336"
                  />
                </Paper>
              </Grid>

              {/* Right Column: 2D Visualizations */}
              <Grid item xs={12} lg={6}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h6">
                      2D Trajectory Views
                    </Typography>

                    {/* Plot Type Selector */}
                    <ToggleButtonGroup
                      value={plotType2D}
                      exclusive
                      onChange={(_, newType) => {
                        if (newType !== null) setPlotType2D(newType);
                      }}
                      size="small"
                    >
                      <ToggleButton value="vertical">Vertical Section</ToggleButton>
                      <ToggleButton value="plan">Plan View</ToggleButton>
                      <ToggleButton value="inclination">Inclination</ToggleButton>
                      <ToggleButton value="azimuth">Azimuth</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  <Plot2D
                    plotType={plotType2D}
                    surveyData={surveyData}
                    isLoading={isLoading}
                    error={error}
                    onRetry={refetch}
                  />
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};
