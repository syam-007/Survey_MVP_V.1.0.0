/**
 * Plot2D component - Generic 2D plot wrapper for all survey plot types.
 */
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { LoadingPlot } from './LoadingPlot';
import { ErrorPlot } from './ErrorPlot';
import type { PlotType, SurveyPlotData } from './types';
import {
  createVerticalSectionPlot,
  createPlanViewPlot,
  createInclinationProfilePlot,
  createAzimuthProfilePlot,
  downsampleData,
} from './utils/plotDataTransform';
import { createPlotConfig, plotMargins } from './utils/plotConfig';

interface Plot2DProps {
  plotType: PlotType;
  surveyData: SurveyPlotData | null;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
}

export const Plot2D: React.FC<Plot2DProps> = ({
  plotType,
  surveyData,
  isLoading,
  error,
  onRetry,
}) => {
  // Downsample data if needed for performance
  const processedData = useMemo(() => {
    if (!surveyData) return null;
    return downsampleData(surveyData, 10000);
  }, [surveyData]);

  // Create plot data based on plot type
  const { data, layout } = useMemo(() => {
    if (!processedData) return { data: [], layout: {} };

    try {
      switch (plotType) {
        case 'vertical':
          return createVerticalSectionPlot(processedData);
        case 'plan':
          return createPlanViewPlot(processedData);
        case 'inclination':
          return createInclinationProfilePlot(processedData);
        case 'azimuth':
          return createAzimuthProfilePlot(processedData);
        default:
          return { data: [], layout: {} };
      }
    } catch (err) {
      console.error('Error creating plot data:', err);
      return { data: [], layout: {} };
    }
  }, [plotType, processedData]);

  // Create plot configuration
  const config = useMemo(
    () => createPlotConfig(`2d_${plotType}`),
    [plotType]
  );

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
    <div style={{ width: '100%', height: '100%', minHeight: '600px' }}>
      <Plot
        data={data}
        layout={{
          ...layout,
          autosize: true,
          margin: plotMargins.default,
        }}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </div>
  );
};
