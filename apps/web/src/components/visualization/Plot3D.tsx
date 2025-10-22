/**
 * Plot3D component - 3D wellbore trajectory visualization.
 */
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { LoadingPlot } from './LoadingPlot';
import { ErrorPlot } from './ErrorPlot';
import type { SurveyPlotData } from './types';
import { create3DWellborePlot, downsampleData } from './utils/plotDataTransform';
import { createPlotConfig } from './utils/plotConfig';

interface Plot3DProps {
  surveyData: SurveyPlotData | null;
  isLoading: boolean;
  error: Error | null;
  showStartMarker?: boolean;
  showEndMarker?: boolean;
  onRetry?: () => void;
}

export const Plot3D: React.FC<Plot3DProps> = ({
  surveyData,
  isLoading,
  error,
  showStartMarker = true,
  showEndMarker = true,
  onRetry,
}) => {
  // Downsample data if needed for performance
  const processedData = useMemo(() => {
    if (!surveyData) return null;
    return downsampleData(surveyData, 10000);
  }, [surveyData]);

  // Create 3D plot data
  const { data, layout } = useMemo(() => {
    if (!processedData) return { data: [], layout: {} };

    try {
      return create3DWellborePlot(processedData, showStartMarker, showEndMarker);
    } catch (err) {
      console.error('Error creating 3D plot data:', err);
      return { data: [], layout: {} };
    }
  }, [processedData, showStartMarker, showEndMarker]);

  // Create plot configuration
  const config = useMemo(() => createPlotConfig('3d'), []);

  // Handle loading state
  if (isLoading) {
    return <LoadingPlot />;
  }

  // Handle error state
  if (error) {
    return <ErrorPlot error={error} onRetry={onRetry} />;
  }

  // Handle no data
  if (!surveyData) {
    return <ErrorPlot error={new Error('No survey data available')} onRetry={onRetry} />;
  }

  // Render plot
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '700px' }}>
      <Plot
        data={data}
        layout={{
          ...layout,
          autosize: true,
          margin: { l: 0, r: 0, t: 40, b: 0 },
        }}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </div>
  );
};
