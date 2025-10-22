/**
 * SingleSurveyPlot3D Component
 *
 * 3D visualization of a single survey trajectory.
 * Similar to ComparisonPlot3D but displays only one survey path.
 */
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, Alert, CircularProgress } from '@mui/material';
import type { SurveyPlotData } from '../visualization/types';
import type { Data } from 'plotly.js';

interface SingleSurveyPlot3DProps {
  surveyData: SurveyPlotData | null;
  isLoading?: boolean;
  error?: Error | null;
  title?: string;
  color?: string;
}

export const SingleSurveyPlot3D: React.FC<SingleSurveyPlot3DProps> = ({
  surveyData,
  isLoading = false,
  error = null,
  title = 'Survey Trajectory',
  color = '#2196F3', // Default blue color
}) => {
  // Create plot traces
  const traces = useMemo(() => {
    if (!surveyData) return [];

    const plotTraces: Data[] = [];

    // Check if we have coordinate data
    const hasCoordinates = surveyData.easting && surveyData.northing && surveyData.tvd &&
                          surveyData.easting.length > 0 && surveyData.northing.length > 0 && surveyData.tvd.length > 0;

    if (!hasCoordinates) {
      return [];
    }

    // Survey trajectory trace
    plotTraces.push({
      x: surveyData.easting,
      y: surveyData.northing,
      z: surveyData.tvd,
      mode: 'lines+markers',
      type: 'scatter3d',
      name: title,
      line: {
        color: color,
        width: 4,
      },
      marker: {
        size: 3,
        color: color,
      },
      // Add hover information
      hovertemplate:
        '<b>East:</b> %{x:.2f}m<br>' +
        '<b>North:</b> %{y:.2f}m<br>' +
        '<b>TVD:</b> %{z:.2f}m<br>' +
        '<extra></extra>',
    } as Data);

    return plotTraces;
  }, [surveyData, title, color]);

  // Layout configuration
  const layout = useMemo(() => {
    if (!surveyData) return {};

    return {
      scene: {
        xaxis: {
          title: 'East [m]',
        },
        yaxis: {
          title: 'North [m]',
        },
        zaxis: {
          title: 'TVD [m]',
          autorange: 'reversed' as const, // Reverse Z-axis for TVD (depth increases downward)
        },
        aspectmode: 'cube' as const, // Maintain aspect ratio
      },
      height: 800,
      showlegend: true,
      legend: {
        x: 0,
        y: 1,
        bgcolor: 'rgba(255, 255, 255, 0.8)',
      },
      hovermode: 'closest' as const,
      autosize: true,
      margin: { l: 0, r: 0, t: 40, b: 0 },
    };
  }, [surveyData]);

  // Config
  const config = useMemo(
    () => ({
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
      toImageButtonOptions: {
        format: 'png',
        filename: 'survey_3d_plot',
        height: 1000,
        width: 1400,
        scale: 2,
      },
    }),
    []
  );

  // Loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={600}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        Failed to load 3D plot: {error.message}
      </Alert>
    );
  }

  // No data
  if (!surveyData) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No survey data available for visualization.
      </Alert>
    );
  }

  // No coordinates
  if (!surveyData.easting || !surveyData.northing || !surveyData.tvd ||
      surveyData.easting.length === 0) {
    return (
      <Alert severity="warning" sx={{ my: 2 }}>
        Survey data does not contain coordinate information (East, North, TVD) for 3D visualization.
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '800px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        '& .plot-container': {
          width: '100% !important',
          height: '100% !important',
        }
      }}
    >
      <Plot
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </Box>
  );
};
