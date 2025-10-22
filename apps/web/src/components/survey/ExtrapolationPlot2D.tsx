/**
 * ExtrapolationPlot2D Component
 *
 * 2D visualization of extrapolated survey data showing:
 * - Original survey points (blue)
 * - Extrapolated points (red)
 */
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, Alert, CircularProgress } from '@mui/material';
import type { Data } from 'plotly.js';
import type { PlotType } from '../visualization/types';

interface ExtrapolationPlot2DProps {
  originalData: {
    md: number[];
    inc: number[];
    azi: number[];
    easting: number[];
    northing: number[];
    tvd: number[];
  } | null;
  extrapolatedData: {
    md: number[];
    inc: number[];
    azi: number[];
    easting: number[];
    northing: number[];
    tvd: number[];
  } | null;
  plotType: PlotType;
  isLoading?: boolean;
  error?: string | null;
}

export const ExtrapolationPlot2D: React.FC<ExtrapolationPlot2DProps> = ({
  originalData,
  extrapolatedData,
  plotType,
  isLoading = false,
  error = null,
}) => {
  // Get x and y data based on plot type
  const getPlotData = (data: typeof originalData, isExtrapolated: boolean) => {
    if (!data) return null;

    const color = isExtrapolated ? '#F44336' : '#2196F3'; // Red for extrapolated, Blue for original
    const name = isExtrapolated ? 'Extrapolated' : 'Original';
    const dash = isExtrapolated ? 'dash' : 'solid';

    switch (plotType) {
      case 'vertical':
        return {
          x: data.northing,
          y: data.tvd,
          xLabel: 'Northing [m]',
          yLabel: 'TVD [m]',
          color,
          name,
          dash,
        };
      case 'plan':
        return {
          x: data.easting,
          y: data.northing,
          xLabel: 'Easting [m]',
          yLabel: 'Northing [m]',
          color,
          name,
          dash,
        };
      case 'inclination':
        return {
          x: data.md,
          y: data.inc,
          xLabel: 'Measured Depth [m]',
          yLabel: 'Inclination [°]',
          color,
          name,
          dash,
        };
      case 'azimuth':
        return {
          x: data.md,
          y: data.azi,
          xLabel: 'Measured Depth [m]',
          yLabel: 'Azimuth [°]',
          color,
          name,
          dash,
        };
      default:
        return null;
    }
  };

  // Create plot traces
  const traces = useMemo(() => {
    const plotTraces: Data[] = [];

    // Original trace
    const originalPlot = getPlotData(originalData, false);
    if (originalPlot) {
      plotTraces.push({
        x: originalPlot.x,
        y: originalPlot.y,
        mode: 'lines+markers',
        type: 'scatter',
        name: originalPlot.name,
        line: {
          color: originalPlot.color,
          width: 2,
        },
        marker: {
          size: 4,
          color: originalPlot.color,
        },
      } as Data);
    }

    // Extrapolated trace
    const extrapolatedPlot = getPlotData(extrapolatedData, true);
    if (extrapolatedPlot) {
      plotTraces.push({
        x: extrapolatedPlot.x,
        y: extrapolatedPlot.y,
        mode: 'lines+markers',
        type: 'scatter',
        name: extrapolatedPlot.name,
        line: {
          color: extrapolatedPlot.color,
          width: 2,
          dash: extrapolatedPlot.dash,
        },
        marker: {
          size: 4,
          color: extrapolatedPlot.color,
        },
      } as Data);
    }

    return plotTraces;
  }, [originalData, extrapolatedData, plotType]);

  // Layout configuration
  const layout = useMemo(() => {
    const plotData = getPlotData(originalData, false) || getPlotData(extrapolatedData, true);
    if (!plotData) return {};

    const baseLayout = {
      xaxis: {
        title: plotData.xLabel,
        showgrid: true,
      },
      yaxis: {
        title: plotData.yLabel,
        showgrid: true,
      },
      showlegend: true,
      legend: {
        x: 0,
        y: 1,
        bgcolor: 'rgba(255, 255, 255, 0.8)',
      },
      hovermode: 'closest' as const,
      autosize: true,
      margin: { l: 60, r: 40, t: 40, b: 60 },
    };

    // Reverse Y-axis for TVD plots
    if (plotType === 'vertical') {
      return {
        ...baseLayout,
        yaxis: {
          ...baseLayout.yaxis,
          autorange: 'reversed' as const,
        },
      };
    }

    return baseLayout;
  }, [originalData, extrapolatedData, plotType]);

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
