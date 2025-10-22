/**
 * Common Plotly configuration utilities.
 */
import type { Config } from 'plotly.js';

/**
 * Default Plotly configuration for all plots.
 */
export const defaultPlotConfig: Partial<Config> = {
  responsive: true,
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  toImageButtonOptions: {
    format: 'png',
    height: 800,
    width: 1200,
    scale: 2,
  },
};

/**
 * Create plot config with custom filename for export.
 */
export function createPlotConfig(
  plotType: string,
  additionalConfig?: Partial<Config>
): Partial<Config> {
  return {
    ...defaultPlotConfig,
    ...additionalConfig,
    toImageButtonOptions: {
      ...defaultPlotConfig.toImageButtonOptions,
      filename: `survey_${plotType}_${Date.now()}`,
    },
  };
}

/**
 * Common margin settings for plots.
 */
export const plotMargins = {
  default: { l: 60, r: 40, t: 60, b: 60 },
  compact: { l: 50, r: 30, t: 50, b: 50 },
  wide: { l: 80, r: 60, t: 60, b: 80 },
};

/**
 * Color palette for plots.
 */
export const plotColors = {
  primary: '#1976d2',
  secondary: '#2e7d32',
  tertiary: '#d32f2f',
  quaternary: '#f57c00',
  gridColor: '#e0e0e0',
  textColor: '#333333',
};
