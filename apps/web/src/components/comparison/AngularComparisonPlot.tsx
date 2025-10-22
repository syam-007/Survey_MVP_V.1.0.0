/**
 * AngularComparisonPlot Component
 *
 * 2D plots showing inclination and azimuth deltas vs measured depth.
 */
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, Alert, CircularProgress, Grid, Paper } from '@mui/material';
import type { ComparisonResult } from '../../types/comparison.types';
import type { Data, Layout } from 'plotly.js';

interface AngularComparisonPlotProps {
  comparison: ComparisonResult | null;
  isLoading?: boolean;
  error?: Error | null;
}

export const AngularComparisonPlot: React.FC<AngularComparisonPlotProps> = ({
  comparison,
  isLoading = false,
  error = null,
}) => {
  // Inclination Delta traces
  const inclinationTraces = useMemo(() => {
    if (!comparison) return [];

    const traces: Data[] = [
      {
        x: comparison.md_data,
        y: comparison.delta_inc,
        name: 'ΔInclination',
        type: 'scatter',
        mode: 'lines',
        line: {
          color: 'purple',
          width: 2,
        },
        hovertemplate: 'MD: %{x:.1f}m<br>ΔInc: %{y:.3f}°<extra></extra>',
      },
    ];

    // Add marker at max deviation
    const maxIncIdx = comparison.delta_inc.findIndex(
      (v) => Math.abs(v) === comparison.statistics.max_delta_inc
    );

    if (maxIncIdx !== -1) {
      traces.push({
        x: [comparison.md_data[maxIncIdx]],
        y: [comparison.delta_inc[maxIncIdx]],
        name: 'Max ΔInc',
        type: 'scatter',
        mode: 'markers+text',
        marker: {
          size: 10,
          color: 'purple',
          symbol: 'circle',
          line: { width: 2, color: 'white' },
        },
        text: [`Max: ${comparison.delta_inc[maxIncIdx].toFixed(2)}°`],
        textposition: 'top center',
        showlegend: false,
      } as Data);
    }

    return traces;
  }, [comparison]);

  // Azimuth Delta traces
  const azimuthTraces = useMemo(() => {
    if (!comparison) return [];

    const traces: Data[] = [
      {
        x: comparison.md_data,
        y: comparison.delta_azi,
        name: 'ΔAzimuth',
        type: 'scatter',
        mode: 'lines',
        line: {
          color: 'teal',
          width: 2,
        },
        hovertemplate: 'MD: %{x:.1f}m<br>ΔAzi: %{y:.3f}°<extra></extra>',
      },
    ];

    // Add marker at max deviation
    const maxAziIdx = comparison.delta_azi.findIndex(
      (v) => Math.abs(v) === comparison.statistics.max_delta_azi
    );

    if (maxAziIdx !== -1) {
      traces.push({
        x: [comparison.md_data[maxAziIdx]],
        y: [comparison.delta_azi[maxAziIdx]],
        name: 'Max ΔAzi',
        type: 'scatter',
        mode: 'markers+text',
        marker: {
          size: 10,
          color: 'teal',
          symbol: 'circle',
          line: { width: 2, color: 'white' },
        },
        text: [`Max: ${comparison.delta_azi[maxAziIdx].toFixed(2)}°`],
        textposition: 'top center',
        showlegend: false,
      } as Data);
    }

    return traces;
  }, [comparison]);

  const inclinationLayout: Partial<Layout> = useMemo(
    () => ({
      title: {
        text: 'Inclination Delta vs MD',
        font: { size: 16 },
      },
      xaxis: {
        title: 'Measured Depth (m)',
        showgrid: true,
      },
      yaxis: {
        title: 'ΔInclination (°)',
        showgrid: true,
        zeroline: true,
        zerolinecolor: 'gray',
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
      height: 450,
      margin: { l: 60, r: 20, t: 45, b: 60 },
    }),
    []
  );

  const azimuthLayout: Partial<Layout> = useMemo(
    () => ({
      title: {
        text: 'Azimuth Delta vs MD',
        font: { size: 16 },
      },
      xaxis: {
        title: 'Measured Depth (m)',
        showgrid: true,
      },
      yaxis: {
        title: 'ΔAzimuth (°)',
        showgrid: true,
        zeroline: true,
        zerolinecolor: 'gray',
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
      height: 450,
      margin: { l: 60, r: 20, t: 45, b: 60 },
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
        height: 400,
        width: 800,
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
        Failed to load angular plots: {error.message}
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
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper elevation={0} sx={{ p: 2 }}>
          <Box
            sx={{
              width: '100%',
              height: '450px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Plot
              data={inclinationTraces}
              layout={inclinationLayout}
              config={{
                ...config,
                toImageButtonOptions: {
                  ...config.toImageButtonOptions,
                  filename: 'inclination_delta_plot',
                },
              }}
              style={{ width: '100%', height: '100%' }}
              useResizeHandler
            />
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper elevation={0} sx={{ p: 2 }}>
          <Box
            sx={{
              width: '100%',
              height: '450px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Plot
              data={azimuthTraces}
              layout={azimuthLayout}
              config={{
                ...config,
                toImageButtonOptions: {
                  ...config.toImageButtonOptions,
                  filename: 'azimuth_delta_plot',
                },
              }}
              style={{ width: '100%', height: '100%' }}
              useResizeHandler
            />
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};
