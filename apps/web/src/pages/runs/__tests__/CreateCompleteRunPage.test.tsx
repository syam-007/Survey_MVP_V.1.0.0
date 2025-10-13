import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { CreateCompleteRunPage } from '../CreateCompleteRunPage';
import wellsService from '../../../services/wellsService';
import runsService from '../../../services/runsService';
import locationsService from '../../../services/locationsService';
import depthsService from '../../../services/depthsService';
import surveysService from '../../../services/surveysService';
import tieonsService from '../../../services/tieonsService';

// Mock services
jest.mock('../../../services/wellsService');
jest.mock('../../../services/runsService');
jest.mock('../../../services/locationsService');
jest.mock('../../../services/depthsService');
jest.mock('../../../services/surveysService');
jest.mock('../../../services/tieonsService');

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('CreateCompleteRunPage Component Tests', () => {
  const mockWells = {
    count: 2,
    next: null,
    previous: null,
    results: [
      { id: '1', well_name: 'Well A', well_type: 'Oil' },
      { id: '2', well_name: 'Well B', well_type: 'Gas' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (wellsService.getWells as jest.Mock).mockResolvedValue(mockWells);
  });

  describe('Page Rendering', () => {
    it('should render page header with breadcrumbs', async () => {
      render(
        <BrowserRouter>
          <CreateCompleteRunPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Create Complete Run')).toBeInTheDocument();
      });

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Runs')).toBeInTheDocument();
    });

    it('should show loading spinner while fetching wells', () => {
      render(
        <BrowserRouter>
          <CreateCompleteRunPage />
        </BrowserRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render form after wells are loaded', async () => {
      render(
        <BrowserRouter>
          <CreateCompleteRunPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/run number/i)).toBeInTheDocument();
      });
    });
  });

  describe('Wells Loading', () => {
    it('should fetch wells on mount', async () => {
      render(
        <BrowserRouter>
          <CreateCompleteRunPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(wellsService.getWells).toHaveBeenCalledWith({ page_size: 1000 });
      });
    });

    it('should display error when wells fetch fails', async () => {
      const error = new Error('Failed to fetch wells');
      (wellsService.getWells as jest.Mock).mockRejectedValue(error);

      render(
        <BrowserRouter>
          <CreateCompleteRunPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit all resources sequentially', async () => {
      const mockRun = { id: 'run-1', run_number: 'RUN-001', well: { id: 'well-1' } };
      const mockLocation = { id: 'loc-1' };
      const mockDepth = { id: 'depth-1' };
      const mockSurvey = { id: 'survey-1' };
      const mockTieOn = { id: 'tieon-1' };

      (runsService.createRun as jest.Mock).mockResolvedValue(mockRun);
      (locationsService.createLocation as jest.Mock).mockResolvedValue(mockLocation);
      (depthsService.createDepth as jest.Mock).mockResolvedValue(mockDepth);
      (surveysService.createSurvey as jest.Mock).mockResolvedValue(mockSurvey);
      (tieonsService.createTieOn as jest.Mock).mockResolvedValue(mockTieOn);

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <CreateCompleteRunPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/run number/i)).toBeInTheDocument();
      });

      // Fill in run info
      await user.type(screen.getByLabelText(/run number/i), 'RUN-001');
      await user.type(screen.getByLabelText(/run name/i), 'Test Run');

      // Navigate to last step
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }

      // Submit form
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(runsService.createRun).toHaveBeenCalled();
        expect(locationsService.createLocation).toHaveBeenCalled();
        expect(depthsService.createDepth).toHaveBeenCalled();
        expect(surveysService.createSurvey).toHaveBeenCalled();
        expect(tieonsService.createTieOn).toHaveBeenCalled();
      });
    });

    it('should navigate to run detail page on success', async () => {
      const mockRun = { id: 'run-123', run_number: 'RUN-001', well: { id: 'well-1' } };

      (runsService.createRun as jest.Mock).mockResolvedValue(mockRun);
      (locationsService.createLocation as jest.Mock).mockResolvedValue({});
      (depthsService.createDepth as jest.Mock).mockResolvedValue({});
      (surveysService.createSurvey as jest.Mock).mockResolvedValue({});
      (tieonsService.createTieOn as jest.Mock).mockResolvedValue({});

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <CreateCompleteRunPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/run number/i)).toBeInTheDocument();
      });

      // Navigate to last step
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }

      // Submit
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/complete run created successfully/i)).toBeInTheDocument();
      });

      // Wait for navigation (after 1 second timeout)
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/runs/run-123');
        },
        { timeout: 2000 }
      );
    });

    it('should display error when submission fails', async () => {
      const error = new Error('Failed to create run');
      (runsService.createRun as jest.Mock).mockRejectedValue(error);

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <CreateCompleteRunPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/run number/i)).toBeInTheDocument();
      });

      // Navigate to last step
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }

      // Submit
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to create complete run/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should navigate back to runs list on cancel', async () => {
      window.confirm = jest.fn(() => true);
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <CreateCompleteRunPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/run number/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/runs');
    });
  });
});
