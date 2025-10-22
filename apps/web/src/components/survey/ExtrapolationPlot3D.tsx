/**
 * ExtrapolationPlot3D Component
 *
 * 3D visualization of extrapolated survey data showing:
 * - Original survey points (blue)
 * - Extrapolated points (red)
 */
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, Alert, CircularProgress } from '@mui/material';
import type { Data } from 'plotly.js';

interface ExtrapolationPlot3DProps {
  originalData: {
    easting: number[];
    northing: number[];
    tvd: number[];
  } | null;
  extrapolatedData: {
    easting: number[];
    northing: number[];
    tvd: number[];
  } | null;
  isLoading?: boolean;
  error?: string | null;
}

export const ExtrapolationPlot3D: React.FC<ExtrapolationPlot3DProps> = ({
  originalData,
  extrapolatedData,
  isLoading = false,
  error = null,
}) => {
  // Create plot traces
  const traces = useMemo(() => {
    const plotTraces: Data[] = [];

    // Original survey trace (blue)
    if (originalData && originalData.easting.length > 0) {
      plotTraces.push({
        x: originalData.easting,
        y: originalData.northing,
        z: originalData.tvd,
        mode: 'lines+markers',
        type: 'scatter3d',
        name: 'Original Survey',
        line: {
          color: '#2196F3', // Blue
          width: 4,
        },
        marker: {
          size: 4,
          color: '#2196F3',
        },
        hovertemplate:
          '<b>Original</b><br>' +
          '<b>East:</b> %{x:.2f}m<br>' +
          '<b>North:</b> %{y:.2f}m<br>' +
          '<b>TVD:</b> %{z:.2f}m<br>' +
          '<extra></extra>',
      } as Data);
    }

    // Extrapolated survey trace (red)
    if (extrapolatedData && extrapolatedData.easting.length > 0) {
      plotTraces.push({
        x: extrapolatedData.easting,
        y: extrapolatedData.northing,
        z: extrapolatedData.tvd,
        mode: 'lines+markers',
        type: 'scatter3d',
        name: 'Extrapolated',
        line: {
          color: '#F44336', // Red
          width: 4,
          dash: 'dash', // Dashed line to distinguish from original
        },
        marker: {
          size: 4,
          color: '#F44336',
        },
        hovertemplate:
          '<b>Extrapolated</b><br>' +
          '<b>East:</b> %{x:.2f}m<br>' +
          '<b>North:</b> %{y:.2f}m<br>' +
          '<b>TVD:</b> %{z:.2f}m<br>' +
          '<extra></extra>',
      } as Data);
    }

    return plotTraces;
  }, [originalData, extrapolatedData]);

  // Layout configuration
  const layout = useMemo(() => {
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
        aspectmode: 'cube' as const,
      },
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
  }, []);

  // Config
  const config = useMemo(() => ({
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['select2d', 'lasso2d'],
  }), []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={700}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!originalData && !extrapolatedData) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No survey data available for visualization
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
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
