/**
 * SurveyVisualizationPage - Main page for survey visualization with 2D and 3D plots.
 */
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import { Plot2D } from '../../components/visualization/Plot2D';
import { Plot3D } from '../../components/visualization/Plot3D';
import { DataSourceToggle } from '../../components/visualization/DataSourceToggle';
import type { PlotType, DataSource } from '../../components/visualization/types';

export const SurveyVisualizationPage: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();

  // State for plot controls
  const [plotType, setPlotType] = useState<PlotType>('vertical');
  const [dataSource, setDataSource] = useState<DataSource>('calculated');
  const [activeTab, setActiveTab] = useState<'2d' | '3d'>('2d');

  // Placeholder data - this will be replaced with actual API data
  const mockSurveyData = {
    md: [0, 100, 200, 300],
    inc: [0, 5, 10, 15],
    azi: [0, 45, 90, 135],
    easting: [0, 3.9, 15.5, 34.9],
    northing: [0, 3.9, 15.5, 34.9],
    tvd: [0, 99.9, 199.6, 298.9],
    pointCount: 4,
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: '2d' | '3d') => {
    setActiveTab(newValue);
  };

  const handlePlotTypeChange = (event: any) => {
    setPlotType(event.target.value as PlotType);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Typography variant="h4" gutterBottom>
        Survey Visualization
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        View 2D and 3D visualizations of your survey data
      </Typography>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <DataSourceToggle
              value={dataSource}
              onChange={setDataSource}
              calculatedCount={mockSurveyData.pointCount}
              interpolatedCount={mockSurveyData.pointCount * 2}
            />
          </Grid>

          {activeTab === '2d' && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Plot Type</InputLabel>
                <Select
                  value={plotType}
                  label="Plot Type"
                  onChange={handlePlotTypeChange}
                >
                  <MenuItem value="vertical">Vertical Section</MenuItem>
                  <MenuItem value="plan">Plan View</MenuItem>
                  <MenuItem value="inclination">Inclination Profile</MenuItem>
                  <MenuItem value="azimuth">Azimuth Profile</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Plot Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="plot tabs">
          <Tab label="2D Plots" value="2d" />
          <Tab label="3D Visualization" value="3d" />
        </Tabs>
      </Paper>

      {/* Plot Content */}
      <Paper sx={{ p: 2 }}>
        {activeTab === '2d' && (
          <Plot2D
            plotType={plotType}
            surveyData={mockSurveyData}
            isLoading={false}
            error={null}
          />
        )}

        {activeTab === '3d' && (
          <Plot3D
            surveyData={mockSurveyData}
            isLoading={false}
            error={null}
            showStartMarker
            showEndMarker
          />
        )}
      </Paper>
    </Box>
  );
};
