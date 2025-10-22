/**
 * Unit tests for Plot2D component.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Plot2D } from '../Plot2D';
import type { SurveyPlotData } from '../types';

// Mock react-plotly.js
vi.mock('react-plotly.js', () => ({
  default: ({ data, layout }: any) => (
    <div data-testid="mock-plot">
      {layout?.title && <div>{layout.title}</div>}
      <div>{data?.length} datasets</div>
    </div>
  ),
}));

const mockSurveyData: SurveyPlotData = {
  md: [0, 100, 200, 300],
  inc: [0, 5, 10, 15],
  azi: [0, 45, 90, 135],
  easting: [0, 3.9, 15.5, 34.9],
  northing: [0, 3.9, 15.5, 34.9],
  tvd: [0, 99.9, 199.6, 298.9],
  pointCount: 4,
};

describe('Plot2D Component', () => {
  it('should render vertical section plot', () => {
    render(
      <Plot2D
        plotType="vertical"
        surveyData={mockSurveyData}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByTestId('mock-plot')).toBeInTheDocument();
    expect(screen.getByText(/Vertical Section/i)).toBeInTheDocument();
  });

  it('should render plan view plot', () => {
    render(
      <Plot2D
        plotType="plan"
        surveyData={mockSurveyData}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByTestId('mock-plot')).toBeInTheDocument();
    expect(screen.getByText(/Plan View/i)).toBeInTheDocument();
  });

  it('should render inclination profile plot', () => {
    render(
      <Plot2D
        plotType="inclination"
        surveyData={mockSurveyData}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByTestId('mock-plot')).toBeInTheDocument();
    expect(screen.getByText(/Inclination Profile/i)).toBeInTheDocument();
  });

  it('should render azimuth profile plot', () => {
    render(
      <Plot2D
        plotType="azimuth"
        surveyData={mockSurveyData}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByTestId('mock-plot')).toBeInTheDocument();
    expect(screen.getByText(/Azimuth Profile/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <Plot2D
        plotType="vertical"
        surveyData={null}
        isLoading={true}
        error={null}
      />
    );

    expect(screen.getByText(/Loading plot data/i)).toBeInTheDocument();
  });

  it('should show error state', () => {
    const error = new Error('Failed to load data');
    render(
      <Plot2D
        plotType="vertical"
        surveyData={null}
        isLoading={false}
        error={error}
      />
    );

    expect(screen.getByText(/Failed to render plot/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed to load data/i)).toBeInTheDocument();
  });

  it('should show error when no data available', () => {
    render(
      <Plot2D
        plotType="vertical"
        surveyData={null}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText(/No survey data available/i)).toBeInTheDocument();
  });
});
