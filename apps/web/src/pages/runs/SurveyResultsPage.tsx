/**
 * SurveyResultsPage
 *
 * Displays complete survey results including metadata, calculations, and visualizations.
 * Supports toggling between calculated and interpolated data sources.
 */
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
  Alert
} from '@mui/material';
import { Plot2D } from '../../components/visualization/Plot2D';
import { SingleSurveyPlot3D } from '../../components/survey/SingleSurveyPlot3D';
import { DataSourceToggle } from '../../components/visualization/DataSourceToggle';
import { DownloadButton } from '../../components/survey/DownloadButton';
import { SurveyDataTable } from '../../components/survey/SurveyDataTable';
import { InterpolationControls } from '../../components/survey/InterpolationControls';
import { useSurveyPlotData } from '../../hooks/useSurveyPlotData';
import surveysService from '../../services/surveysService';
import type { PlotType } from '../../components/visualization/types';

export const SurveyResultsPage: React.FC = () => {
  const { runId, surveyDataId } = useParams<{ runId: string; surveyDataId: string }>();
  const navigate = useNavigate();

  const [dataSource, setDataSource] = useState<'calculated' | 'interpolated'>('calculated');
  const [plotType2D, setPlotType2D] = useState<PlotType>('vertical');
  const [resolution, setResolution] = useState(5);
  const [calculatedSurveyId, setCalculatedSurveyId] = useState<string | null>(null);

  const { data: surveyData, metadata, isLoading, error, refetch } = useSurveyPlotData(
    surveyDataId!,
    dataSource,
    resolution
  );

  // Fetch calculated survey ID on mount
  useEffect(() => {
    const fetchCalculatedSurveyId = async () => {
      if (!surveyDataId) return;

      try {
        const result = await surveysService.getSurveyById(surveyDataId);
        setCalculatedSurveyId(result.id);
      } catch (err) {
        console.error('Failed to fetch calculated survey ID:', err);
      }
    };

    fetchCalculatedSurveyId();
  }, [surveyDataId]);

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

      {/* Interpolation Controls */}
      {dataSource === 'interpolated' && (
        <InterpolationControls
          calculatedSurveyId={calculatedSurveyId}
          currentResolution={resolution}
          onResolutionChange={setResolution}
          onInterpolationComplete={refetch}
        />
      )}

      {/* Data Source Toggle and Download Buttons */}
      {metadata && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <DataSourceToggle
            value={dataSource}
            onChange={setDataSource}
            calculatedCount={metadata.calculatedCount}
            interpolatedCount={metadata.interpolatedCount}
          />

          {/* Download Buttons */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DownloadButton surveyId={surveyDataId} dataType="calculated" />
            {dataSource === 'interpolated' && (
              <DownloadButton surveyId={surveyDataId} dataType="interpolated" />
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
    </Container>
  );
};
