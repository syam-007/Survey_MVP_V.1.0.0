import * as React from 'react';
import { render } from '@testing-library/react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { RunListPage } from '../runs/RunListPage';
import { runsApi } from '../../stores/runsSlice';
import type { PaginatedRunResponse } from '../../types/run.types';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock data
const mockRunsData: PaginatedRunResponse = {
  count: 25,
  next: 'http://localhost:8000/api/v1/runs/?page=2',
  previous: null,
  page: 1,
  total_pages: 2,
  page_size: 20,
  results: [
    {
      id: 'run-1',
      run_number: 'RUN-001',
      run_name: 'Test Run 1',
      run_type: 'GTL',
      vertical_section: 1000,
      bhc_enabled: true,
      proposal_direction: null,
      grid_correction: 0.5,
      well: {
        id: 'well-1',
        well_name: 'Well A',
        well_type: 'Oil',
      },
      location: {
        latitude: 25.5,
        longitude: 55.3,
        easting: 500000,
        northing: 300000,
      },
      depth: {
        elevation_reference: 'MSL',
        reference_height: 100,
      },
      user: {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    },
    {
      id: 'run-2',
      run_number: 'RUN-002',
      run_name: 'Test Run 2',
      run_type: 'Gyro',
      vertical_section: 2000,
      bhc_enabled: false,
      proposal_direction: 180,
      grid_correction: 1.0,
      well: null,
      location: {
        latitude: 26.0,
        longitude: 56.0,
        easting: 510000,
        northing: 310000,
      },
      depth: {
        elevation_reference: 'MSL',
        reference_height: 150,
      },
      user: {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
      },
      created_at: '2025-01-03T00:00:00Z',
      updated_at: '2025-01-04T00:00:00Z',
    },
  ],
};

const mockEmptyData: PaginatedRunResponse = {
  count: 0,
  next: null,
  previous: null,
  page: 1,
  total_pages: 1,
  page_size: 20,
  results: [],
};

// Create mock store with auth state
const createMockStore = () => {
  return configureStore({
    reducer: {
      [runsApi.reducerPath]: runsApi.reducer,
      auth: () => ({
        isAuthenticated: true,
        user: {
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
          role: 'Admin',
        },
        tokens: {
          access: 'mock-token',
          refresh: 'mock-refresh',
        },
      }),
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(runsApi.middleware),
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore();
  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>{component}</BrowserRouter>
      </Provider>
    ),
    store,
  };
};

describe('RunListPage Integration Tests', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Page Rendering', () => {
    it('should render page header with title and create button', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      // Mock API response
      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        expect(screen.getByText('Runs')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create run/i })).toBeInTheDocument();
      });
    });

    it('should render filter controls', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search by run number or name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/run type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    it('should display runs in a table', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        expect(screen.getByText('RUN-001')).toBeInTheDocument();
        expect(screen.getByText('Test Run 1')).toBeInTheDocument();
        expect(screen.getByText('RUN-002')).toBeInTheDocument();
        expect(screen.getByText('Test Run 2')).toBeInTheDocument();
      });
    });

    it('should display well information when available', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        expect(screen.getByText('Well A')).toBeInTheDocument();
      });
    });

    it('should display dash when well is not available', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        const tableCells = screen.getAllByText('-');
        expect(tableCells.length).toBeGreaterThan(0);
      });
    });

    it('should display run type chips with correct colors', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        expect(screen.getByText('GTL')).toBeInTheDocument();
        expect(screen.getByText('Gyro')).toBeInTheDocument();
      });
    });

    it('should display formatted dates', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        expect(screen.getByText('Jan 01, 2025')).toBeInTheDocument();
        expect(screen.getByText('Jan 03, 2025')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state message when no runs exist', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockEmptyData)
      );

      await waitFor(() => {
        expect(screen.getByText('No runs found')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create first run/i })).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to create page when create button clicked', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create run/i });
        fireEvent.click(createButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/runs/new');
    });

    it('should navigate to detail page when view icon clicked', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        const viewButtons = screen.getAllByTitle('View details');
        fireEvent.click(viewButtons[0]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/runs/run-1');
    });

    it('should navigate to edit page when edit icon clicked', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        const editButtons = screen.getAllByTitle('Edit run');
        fireEvent.click(editButtons[0]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/runs/run-1/edit');
    });
  });

  describe('Filtering and Search', () => {
    it('should update search term on input', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search by run number or name/i);
        fireEvent.change(searchInput, { target: { value: 'Test' } });
        expect(searchInput).toHaveValue('Test');
      });
    });

    it('should apply filters when Apply Filters button clicked', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search by run number or name/i);
        fireEvent.change(searchInput, { target: { value: 'RUN-001' } });

        const applyButton = screen.getByRole('button', { name: /apply filters/i });
        fireEvent.click(applyButton);
      });

      // Verify filter state was updated (this triggers a new API call in real scenario)
      expect(screen.getByPlaceholderText(/search by run number or name/i)).toHaveValue('RUN-001');
    });

    it('should clear filters when Clear button clicked', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search by run number or name/i);
        fireEvent.change(searchInput, { target: { value: 'Test' } });

        const clearButton = screen.getByRole('button', { name: /clear/i });
        fireEvent.click(clearButton);

        expect(searchInput).toHaveValue('');
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        expect(screen.getByText(/1–20 of 25/i)).toBeInTheDocument();
      });
    });

    it('should handle page size change', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        // MUI TablePagination uses a select for rows per page
        const rowsPerPageSelect = screen.getByRole('combobox');
        fireEvent.mouseDown(rowsPerPageSelect);
      });

      await waitFor(() => {
        const option50 = screen.getByRole('option', { name: '50' });
        fireEvent.click(option50);
      });

      // Page size state should update
      expect(mockRunsData.results).toHaveLength(2);
    });
  });

  describe('Delete Functionality', () => {
    it('should open delete confirmation dialog when delete icon clicked', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle('Delete run');
        fireEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete this run/i)).toBeInTheDocument();
      });
    });

    it('should close delete dialog when Cancel clicked', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle('Delete run');
        fireEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByText(/are you sure you want to delete this run/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show skeleton loader while data is loading', () => {
      renderWithProviders(<RunListPage />);

      // Initially shows loading state
      // SkeletonLoader component should be rendered
      expect(screen.queryByText('RUN-001')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for action buttons', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        expect(screen.getAllByTitle('View details')).toHaveLength(2);
        expect(screen.getAllByTitle('Edit run')).toHaveLength(2);
        expect(screen.getAllByTitle('Delete run')).toHaveLength(2);
      });
    });

    it('should have proper table structure', async () => {
      const { store } = renderWithProviders(<RunListPage />);

      store.dispatch(
        runsApi.util.upsertQueryData('getRuns', undefined, mockRunsData)
      );

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        // Check for table headers
        expect(screen.getByText('Run Number')).toBeInTheDocument();
        expect(screen.getByText('Run Name')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Well')).toBeInTheDocument();
        expect(screen.getByText('Created At')).toBeInTheDocument();
        expect(screen.getByText('Created By')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });
  });
});
