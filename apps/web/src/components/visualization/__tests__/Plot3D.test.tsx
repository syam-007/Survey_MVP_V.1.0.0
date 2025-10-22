/**
 * Unit tests for Plot3D component.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Plot3D } from '../Plot3D';
import type { SurveyPlotData } from '../types';

// Mock react-plotly.js
vi.mock('react-plotly.js', () => ({
  default: ({ data, layout }: any) => (
    <div data-testid="mock-plot-3d">
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

describe('Plot3D Component', () => {
  it('should render 3D wellbore plot', () => {
    render(
      <Plot3D
        surveyData={mockSurveyData}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByTestId('mock-plot-3d')).toBeInTheDocument();
    expect(screen.getByText(/3D Wellbore Trajectory/i)).toBeInTheDocument();
  });

  it('should render with start and end markers', () => {
    render(
      <Plot3D
        surveyData={mockSurveyData}
        isLoading={false}
        error={null}
        showStartMarker
        showEndMarker
      />
    );

    const mockPlot = screen.getByTestId('mock-plot-3d');
    expect(mockPlot).toBeInTheDocument();
    // With wellbore + start + end markers, should have 3 datasets
    expect(screen.getByText(/3 datasets/i)).toBeInTheDocument();
  });

  it('should render without markers', () => {
    render(
      <Plot3D
        surveyData={mockSurveyData}
        isLoading={false}
        error={null}
        showStartMarker={false}
        showEndMarker={false}
      />
    );

    const mockPlot = screen.getByTestId('mock-plot-3d');
    expect(mockPlot).toBeInTheDocument();
    // Only wellbore dataset
    expect(screen.getByText(/1 datasets/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <Plot3D
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
      <Plot3D
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
      <Plot3D
        surveyData={null}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText(/No survey data available/i)).toBeInTheDocument();
  });
});
