/**
 * ComparisonPlot3D Component
 *
 * 3D visualization of survey comparison with delta vectors.
 * Based on Story 5.4: Comparison Visualization (2D & 3D)
 */
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, Alert, CircularProgress } from '@mui/material';
import type { ComparisonResult } from '../../types/comparison.types';
import type { AdjustmentState } from '../../types/adjustment.types';
import type { Data } from 'plotly.js';

interface ComparisonPlot3DProps {
  comparison: ComparisonResult | null;
  ratioFactor?: number;
  showReference?: boolean;
  showPrimary?: boolean;
  showDeltas?: boolean;
  isLoading?: boolean;
  error?: Error | null;
  adjustmentState?: AdjustmentState | null;
}

export const ComparisonPlot3D: React.FC<ComparisonPlot3DProps> = ({
  comparison,
  ratioFactor = 10,
  showReference = true,
  showPrimary = true,
  showDeltas = true,
  isLoading = false,
  error = null,
  adjustmentState = null,
}) => {
  // Create plot traces - matching Streamlit implementation with adjustment support
  const traces = useMemo(() => {
    if (!comparison) return [];

    const plotTraces: Data[] = [];

    // Check if we have full survey coordinate data
    const hasFullData = comparison.reference_easting && comparison.reference_northing && comparison.reference_tvd &&
                        comparison.comparison_easting && comparison.comparison_northing && comparison.comparison_tvd;

    if (!hasFullData) {
      // No full survey data available
      return [];
    }

    // Reference survey trace (blue line) - matching Streamlit
    if (showReference) {
      plotTraces.push({
        x: comparison.reference_easting,
        y: comparison.reference_northing,
        z: comparison.reference_tvd,
        mode: 'lines',
        type: 'scatter3d',
        name: 'Reference Survey',
        line: {
          color: 'blue',
          width: 4,
        },
      } as Data);
    }

    // Comparative survey trace (red line) - matching Streamlit
    // Use adjusted coordinates if available, otherwise use original
    if (showPrimary) {
      const hasAdjustment = adjustmentState && adjustmentState.has_adjustment;

      plotTraces.push({
        x: hasAdjustment ? adjustmentState.east_adjusted : comparison.comparison_easting,
        y: hasAdjustment ? adjustmentState.north_adjusted : comparison.comparison_northing,
        z: hasAdjustment ? adjustmentState.tvd_adjusted : comparison.comparison_tvd,
        mode: 'lines',
        type: 'scatter3d',
        name: hasAdjustment ? 'Comparative Survey (Adjusted)' : 'Comparative Survey',
        line: {
          color: 'red',
          width: 4,
        },
      } as Data);
    }

    return plotTraces;
  }, [comparison, showReference, showPrimary, adjustmentState]);

  // Layout configuration - matching Streamlit
  const layout = useMemo(() => {
    if (!comparison) return {};

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
          autorange: 'reversed' as const, // Reverse Z-axis for TVD
        },
        aspectmode: 'cube' as const, // THIS FIXES THE AXES SCALE - prevents scaling while rotating
      },
      height: 1200, // Matching Streamlit height
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
  }, [comparison]);

  // Config
  const config = useMemo(
    () => ({
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
      toImageButtonOptions: {
        format: 'png',
        filename: 'comparison_3d_plot',
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
  if (!comparison) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No comparison data available for visualization.
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '1200px',
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
