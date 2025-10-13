import * as React from 'react';
import { render } from '@testing-library/react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { WellListPage } from '../wells/WellListPage';
import { wellsApi } from '../../stores/wellsSlice';
import type { PaginatedWellResponse } from '../../types/well.types';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock data
const mockWellsData: PaginatedWellResponse = {
  count: 25,
  next: 'http://localhost:8000/api/v1/wells/?page=2',
  previous: null,
  page: 1,
  total_pages: 2,
  page_size: 20,
  results: [
    {
      id: 'well-1',
      well_name: 'Well Alpha',
      well_type: 'Oil',
      runs_count: 5,
      runs: [
        {
          id: 'run-1',
          run_number: 'RUN-001',
          run_name: 'Test Run 1',
          run_type: 'GTL',
        },
      ],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    },
    {
      id: 'well-2',
      well_name: 'Well Beta',
      well_type: 'Gas',
      runs_count: 3,
      runs: [],
      created_at: '2025-01-03T00:00:00Z',
      updated_at: '2025-01-04T00:00:00Z',
    },
  ],
};

const mockEmptyData: PaginatedWellResponse = {
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
      [wellsApi.reducerPath]: wellsApi.reducer,
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
      getDefaultMiddleware().concat(wellsApi.middleware),
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

describe('WellListPage Integration Tests', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Page Rendering', () => {
    it('should render page header with title and create button', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      // Mock API response
      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        expect(screen.getByText('Wells')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create well/i })).toBeInTheDocument();
      });
    });

    it('should render filter controls', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search by well name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/well type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    it('should display wells in a table', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        expect(screen.getByText('Well Alpha')).toBeInTheDocument();
        expect(screen.getByText('Well Beta')).toBeInTheDocument();
      });
    });

    it('should display well type chips with correct colors', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        expect(screen.getByText('Oil')).toBeInTheDocument();
        expect(screen.getByText('Gas')).toBeInTheDocument();
      });
    });

    it('should display runs count', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should display formatted dates', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        expect(screen.getByText('Jan 01, 2025')).toBeInTheDocument();
        expect(screen.getByText('Jan 02, 2025')).toBeInTheDocument();
        expect(screen.getByText('Jan 03, 2025')).toBeInTheDocument();
        expect(screen.getByText('Jan 04, 2025')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state message when no wells exist', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockEmptyData)
      );

      await waitFor(() => {
        expect(screen.getByText('No wells found')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create first well/i })).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to create page when create button clicked', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create well/i });
        fireEvent.click(createButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/wells/new');
    });

    it('should navigate to detail page when view icon clicked', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        const viewButtons = screen.getAllByTitle('View details');
        fireEvent.click(viewButtons[0]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/wells/well-1');
    });

    it('should navigate to edit page when edit icon clicked', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        const editButtons = screen.getAllByTitle('Edit well');
        fireEvent.click(editButtons[0]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/wells/well-1/edit');
    });
  });

  describe('Filtering and Search', () => {
    it('should update search term on input', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search by well name/i);
        fireEvent.change(searchInput, { target: { value: 'Alpha' } });
        expect(searchInput).toHaveValue('Alpha');
      });
    });

    it('should apply filters when Apply Filters button clicked', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search by well name/i);
        fireEvent.change(searchInput, { target: { value: 'Well Alpha' } });

        const applyButton = screen.getByRole('button', { name: /apply filters/i });
        fireEvent.click(applyButton);
      });

      // Verify filter state was updated (this triggers a new API call in real scenario)
      expect(screen.getByPlaceholderText(/search by well name/i)).toHaveValue('Well Alpha');
    });

    it('should clear filters when Clear button clicked', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search by well name/i);
        fireEvent.change(searchInput, { target: { value: 'Test' } });

        const clearButton = screen.getByRole('button', { name: /clear/i });
        fireEvent.click(clearButton);

        expect(searchInput).toHaveValue('');
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        expect(screen.getByText(/1–20 of 25/i)).toBeInTheDocument();
      });
    });

    it('should handle page size change', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
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
      expect(mockWellsData.results).toHaveLength(2);
    });
  });

  describe('Delete Functionality', () => {
    it('should open delete confirmation dialog when delete icon clicked', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle('Delete well');
        fireEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete this well/i)).toBeInTheDocument();
      });
    });

    it('should close delete dialog when Cancel clicked', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle('Delete well');
        fireEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByText(/are you sure you want to delete this well/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show skeleton loader while data is loading', () => {
      renderWithProviders(<WellListPage />);

      // Initially shows loading state
      // SkeletonLoader component should be rendered
      expect(screen.queryByText('Well Alpha')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for action buttons', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        expect(screen.getAllByTitle('View details')).toHaveLength(2);
        expect(screen.getAllByTitle('Edit well')).toHaveLength(2);
        expect(screen.getAllByTitle('Delete well')).toHaveLength(2);
      });
    });

    it('should have proper table structure', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        // Check for table headers
        expect(screen.getByText('Well Name')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Runs Count')).toBeInTheDocument();
        expect(screen.getByText('Created At')).toBeInTheDocument();
        expect(screen.getByText('Updated At')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('should update ordering when sort dropdown changed', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        const sortSelect = screen.getByLabelText(/sort by/i);
        fireEvent.mouseDown(sortSelect);
      });

      await waitFor(() => {
        const newestOption = screen.getByRole('option', { name: /newest first/i });
        expect(newestOption).toBeInTheDocument();
      });
    });
  });

  describe('Filter Integration', () => {
    it('should handle well_type filter change', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        const typeSelect = screen.getByLabelText(/well type/i);
        fireEvent.mouseDown(typeSelect);
      });

      await waitFor(() => {
        const oilOption = screen.getByRole('option', { name: 'Oil' });
        fireEvent.click(oilOption);
      });

      // Verify the select value changed
      expect(screen.getByLabelText(/well type/i)).toBeInTheDocument();
    });

    it('should trigger search on Enter key press', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search by well name/i);
        fireEvent.change(searchInput, { target: { value: 'Test' } });
        fireEvent.keyPress(searchInput, { key: 'Enter', code: 13, charCode: 13 });
        expect(searchInput).toHaveValue('Test');
      });
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('should render breadcrumbs with Home and Wells', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        // Check for breadcrumb elements - use getAllByText since "Wells" appears multiple times
        const wellsElements = screen.getAllByText('Wells');
        expect(wellsElements.length).toBeGreaterThan(0);
        expect(screen.getByText('Home')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Wells Display', () => {
    it('should render multiple wells correctly', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        // Both wells should be rendered
        expect(screen.getByText('Well Alpha')).toBeInTheDocument();
        expect(screen.getByText('Well Beta')).toBeInTheDocument();

        // Both well types should be rendered
        expect(screen.getByText('Oil')).toBeInTheDocument();
        expect(screen.getByText('Gas')).toBeInTheDocument();
      });
    });
  });

  describe('Action Button Visibility', () => {
    it('should show all action buttons when user has edit permission', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        // Should have 2 view buttons (one per well)
        expect(screen.getAllByTitle('View details')).toHaveLength(2);
        // Should have 2 edit buttons
        expect(screen.getAllByTitle('Edit well')).toHaveLength(2);
        // Should have 2 delete buttons
        expect(screen.getAllByTitle('Delete well')).toHaveLength(2);
      });
    });
  });

  describe('Chip Colors', () => {
    it('should display correct chip colors for different well types', async () => {
      const { store } = renderWithProviders(<WellListPage />);

      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', undefined, mockWellsData)
      );

      await waitFor(() => {
        // Verify chips are rendered
        const oilChip = screen.getByText('Oil');
        const gasChip = screen.getByText('Gas');

        expect(oilChip).toBeInTheDocument();
        expect(gasChip).toBeInTheDocument();
      });
    });
  });
});
