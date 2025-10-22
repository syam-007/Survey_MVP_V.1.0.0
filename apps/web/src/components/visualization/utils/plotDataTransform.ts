/**
 * Data transformation utilities for plot data.
 */
import type { Data, Layout } from 'plotly.js';
import type { SurveyPlotData, CalculatedSurveyResponse, InterpolatedSurveyResponse } from '../types';
import { plotColors } from './plotConfig';

/**
 * Transform calculated survey API response to plot data format.
 */
export function transformCalculatedData(
  apiData: CalculatedSurveyResponse
): SurveyPlotData {
  return {
    md: apiData.survey_data.md_data,
    inc: apiData.survey_data.inc_data,
    azi: apiData.survey_data.azi_data,
    easting: apiData.easting,
    northing: apiData.northing,
    tvd: apiData.tvd,
    pointCount: apiData.survey_data.row_count,
  };
}

/**
 * Transform interpolated survey API response to plot data format.
 */
export function transformInterpolatedData(
  apiData: InterpolatedSurveyResponse
): SurveyPlotData {
  return {
    md: apiData.md_interpolated,
    inc: apiData.inc_interpolated,
    azi: apiData.azi_interpolated,
    easting: apiData.easting_interpolated,
    northing: apiData.northing_interpolated,
    tvd: apiData.tvd_interpolated,
    pointCount: apiData.point_count,
  };
}

/**
 * Downsample data for performance if point count exceeds threshold.
 */
export function downsampleData(
  surveyData: SurveyPlotData,
  maxPoints: number = 10000
): SurveyPlotData {
  const pointCount = surveyData.md.length;

  if (pointCount <= maxPoints) {
    return surveyData;
  }

  // Calculate stride to achieve target point count
  const stride = Math.ceil(pointCount / maxPoints);

  return {
    md: surveyData.md.filter((_, i) => i % stride === 0),
    inc: surveyData.inc.filter((_, i) => i % stride === 0),
    azi: surveyData.azi.filter((_, i) => i % stride === 0),
    easting: surveyData.easting.filter((_, i) => i % stride === 0),
    northing: surveyData.northing.filter((_, i) => i % stride === 0),
    tvd: surveyData.tvd.filter((_, i) => i % stride === 0),
    pointCount: Math.ceil(pointCount / stride),
  };
}

/**
 * Create vertical section plot data (TVD vs Horizontal Displacement).
 */
export function createVerticalSectionPlot(surveyData: SurveyPlotData): {
  data: Data[];
  layout: Partial<Layout>;
} {
  // Calculate horizontal displacement
  const horizontalDisplacement = surveyData.easting.map((e, i) =>
    Math.sqrt(e * e + surveyData.northing[i] * surveyData.northing[i])
  );

  const plotData: Data[] = [
    {
      x: horizontalDisplacement,
      y: surveyData.tvd,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Wellbore Trajectory',
      line: { color: plotColors.primary, width: 2 },
      marker: { size: 4, color: plotColors.primary },
      hovertemplate:
        '<b>Horizontal Displacement:</b> %{x:.2f} m<br>' +
        '<b>TVD:</b> %{y:.2f} m<br>' +
        '<extra></extra>',
    },
  ];

  const layout: Partial<Layout> = {
    title: 'Vertical Section',
    xaxis: { title: 'Horizontal Displacement (m)', gridcolor: plotColors.gridColor },
    yaxis: { title: 'TVD (m)', autorange: 'reversed', gridcolor: plotColors.gridColor },
    hovermode: 'closest',
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#ffffff',
  };

  return { data: plotData, layout };
}

/**
 * Create plan view plot data (Easting vs Northing).
 */
export function createPlanViewPlot(surveyData: SurveyPlotData): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const plotData: Data[] = [
    {
      x: surveyData.easting,
      y: surveyData.northing,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Wellbore Path',
      line: { color: plotColors.secondary, width: 2 },
      marker: { size: 4, color: plotColors.secondary },
      hovertemplate:
        '<b>Easting:</b> %{x:.2f} m<br>' +
        '<b>Northing:</b> %{y:.2f} m<br>' +
        '<extra></extra>',
    },
  ];

  const layout: Partial<Layout> = {
    title: 'Plan View',
    xaxis: { title: 'Easting (m)', gridcolor: plotColors.gridColor },
    yaxis: {
      title: 'Northing (m)',
      scaleanchor: 'x',
      scaleratio: 1,
      gridcolor: plotColors.gridColor,
    },
    hovermode: 'closest',
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#ffffff',
  };

  return { data: plotData, layout };
}

/**
 * Create inclination profile plot data (MD vs Inclination).
 */
export function createInclinationProfilePlot(surveyData: SurveyPlotData): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const plotData: Data[] = [
    {
      x: surveyData.md,
      y: surveyData.inc,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Inclination',
      line: { color: plotColors.tertiary, width: 2 },
      marker: { size: 4, color: plotColors.tertiary },
      hovertemplate:
        '<b>MD:</b> %{x:.2f} m<br>' +
        '<b>Inclination:</b> %{y:.2f}°<br>' +
        '<extra></extra>',
    },
  ];

  const layout: Partial<Layout> = {
    title: 'Inclination Profile',
    xaxis: { title: 'Measured Depth (m)', gridcolor: plotColors.gridColor },
    yaxis: {
      title: 'Inclination (°)',
      range: [0, 180],
      gridcolor: plotColors.gridColor,
    },
    hovermode: 'closest',
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#ffffff',
  };

  return { data: plotData, layout };
}

/**
 * Create azimuth profile plot data (MD vs Azimuth).
 */
export function createAzimuthProfilePlot(surveyData: SurveyPlotData): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const plotData: Data[] = [
    {
      x: surveyData.md,
      y: surveyData.azi,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Azimuth',
      line: { color: plotColors.quaternary, width: 2 },
      marker: { size: 4, color: plotColors.quaternary },
      hovertemplate:
        '<b>MD:</b> %{x:.2f} m<br>' +
        '<b>Azimuth:</b> %{y:.2f}°<br>' +
        '<extra></extra>',
    },
  ];

  const layout: Partial<Layout> = {
    title: 'Azimuth Profile',
    xaxis: { title: 'Measured Depth (m)', gridcolor: plotColors.gridColor },
    yaxis: {
      title: 'Azimuth (°)',
      range: [0, 360],
      gridcolor: plotColors.gridColor,
    },
    hovermode: 'closest',
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#ffffff',
  };

  return { data: plotData, layout };
}

/**
 * Create 3D wellbore plot data.
 */
export function create3DWellborePlot(
  surveyData: SurveyPlotData,
  showStartMarker: boolean = true,
  showEndMarker: boolean = true
): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const plotData: Data[] = [
    {
      x: surveyData.easting,
      y: surveyData.northing,
      z: surveyData.tvd.map((t) => -t), // Negate TVD so wellbore goes down
      type: 'scatter3d',
      mode: 'lines+markers',
      name: 'Wellbore',
      line: { color: plotColors.primary, width: 4 },
      marker: { size: 3, color: plotColors.primary },
      hovertemplate:
        '<b>MD:</b> %{text}<br>' +
        '<b>Easting:</b> %{x:.2f} m<br>' +
        '<b>Northing:</b> %{y:.2f} m<br>' +
        '<b>TVD:</b> %{z:.2f} m<br>' +
        '<extra></extra>',
      text: surveyData.md.map((m) => `${m.toFixed(2)} m`),
    },
  ];

  // Add start marker
  if (showStartMarker) {
    plotData.push({
      x: [surveyData.easting[0]],
      y: [surveyData.northing[0]],
      z: [-surveyData.tvd[0]],
      type: 'scatter3d',
      mode: 'markers',
      name: 'Start',
      marker: { size: 8, color: plotColors.secondary, symbol: 'diamond' },
      hovertemplate: '<b>Start Point</b><br><extra></extra>',
    });
  }

  // Add end marker
  if (showEndMarker) {
    const lastIdx = surveyData.easting.length - 1;
    plotData.push({
      x: [surveyData.easting[lastIdx]],
      y: [surveyData.northing[lastIdx]],
      z: [-surveyData.tvd[lastIdx]],
      type: 'scatter3d',
      mode: 'markers',
      name: 'End',
      marker: { size: 8, color: plotColors.tertiary, symbol: 'square' },
      hovertemplate: '<b>End Point</b><br><extra></extra>',
    });
  }

  const layout: Partial<Layout> = {
    title: '3D Wellbore Trajectory',
    scene: {
      xaxis: { title: 'Easting (m)', gridcolor: plotColors.gridColor },
      yaxis: { title: 'Northing (m)', gridcolor: plotColors.gridColor },
      zaxis: {
        title: 'TVD (m)',
        autorange: 'reversed',
        gridcolor: plotColors.gridColor,
      },
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.5 },
        center: { x: 0, y: 0, z: 0 },
      },
      aspectmode: 'data',
    },
    hovermode: 'closest',
    showlegend: true,
    paper_bgcolor: '#ffffff',
  };

  return { data: plotData, layout };
}
