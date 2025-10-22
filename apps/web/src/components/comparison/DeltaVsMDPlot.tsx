/**
 * DeltaVsMDPlot Component
 *
 * 2D plot showing delta magnitude vs measured depth.
 */
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, Alert, CircularProgress } from '@mui/material';
import type { ComparisonResult } from '../../types/comparison.types';
import type { Data, Layout } from 'plotly.js';

interface DeltaVsMDPlotProps {
  comparison: ComparisonResult | null;
  isLoading?: boolean;
  error?: Error | null;
}

export const DeltaVsMDPlot: React.FC<DeltaVsMDPlotProps> = ({
  comparison,
  isLoading = false,
  error = null,
}) => {
  const traces = useMemo(() => {
    if (!comparison) return [];

    const plotTraces: Data[] = [
      {
        x: comparison.md_data,
        y: comparison.delta_horizontal,
        name: 'Horizontal Deviation',
        type: 'scatter',
        mode: 'lines',
        line: {
          color: 'orange',
          width: 2,
        },
        hovertemplate: 'MD: %{x:.1f}m<br>Horizontal: %{y:.3f}m<extra></extra>',
      },
      {
        x: comparison.md_data,
        y: comparison.delta_total,
        name: 'Total Deviation',
        type: 'scatter',
        mode: 'lines',
        line: {
          color: 'red',
          width: 2,
        },
        hovertemplate: 'MD: %{x:.1f}m<br>Total: %{y:.3f}m<extra></extra>',
      },
    ];

    // Add marker at max deviation point
    const stats = comparison.statistics;
    const maxHorizontalIdx = comparison.delta_horizontal.indexOf(stats.max_delta_horizontal);
    const maxTotalIdx = comparison.delta_total.indexOf(stats.max_delta_total);

    if (maxHorizontalIdx !== -1) {
      plotTraces.push({
        x: [comparison.md_data[maxHorizontalIdx]],
        y: [stats.max_delta_horizontal],
        name: 'Max Horizontal',
        type: 'scatter',
        mode: 'markers+text',
        marker: {
          size: 10,
          color: 'orange',
          symbol: 'circle',
          line: { width: 2, color: 'white' },
        },
        text: [`Max: ${stats.max_delta_horizontal.toFixed(3)}m`],
        textposition: 'top center',
        showlegend: false,
      } as Data);
    }

    if (maxTotalIdx !== -1) {
      plotTraces.push({
        x: [comparison.md_data[maxTotalIdx]],
        y: [stats.max_delta_total],
        name: 'Max Total',
        type: 'scatter',
        mode: 'markers+text',
        marker: {
          size: 10,
          color: 'red',
          symbol: 'circle',
          line: { width: 2, color: 'white' },
        },
        text: [`Max: ${stats.max_delta_total.toFixed(3)}m`],
        textposition: 'top center',
        showlegend: false,
      } as Data);
    }

    return plotTraces;
  }, [comparison]);

  const layout: Partial<Layout> = useMemo(
    () => ({
      title: {
        text: 'Deviation vs Measured Depth',
        font: { size: 18 },
      },
      xaxis: {
        title: 'Measured Depth (m)',
        showgrid: true,
      },
      yaxis: {
        title: 'Deviation (m)',
        showgrid: true,
      },
      showlegend: true,
      legend: {
        x: 1,
        y: 1,
        xanchor: 'right',
        bgcolor: 'rgba(255, 255, 255, 0.8)',
      },
      hovermode: 'x unified',
      autosize: true,
      height: 600,
      margin: { l: 60, r: 20, t: 50, b: 60 },
    }),
    []
  );

  const config = useMemo(
    () => ({
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d'],
      toImageButtonOptions: {
        format: 'png',
        filename: 'delta_vs_md_plot',
        height: 600,
        width: 1000,
        scale: 2,
      },
    }),
    []
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        Failed to load plot: {error.message}
      </Alert>
    );
  }

  if (!comparison) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No comparison data available.
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '600px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
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
