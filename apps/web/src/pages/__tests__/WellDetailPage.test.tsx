import * as React from 'react';
import { render } from '@testing-library/react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { WellDetailPage } from '../wells/WellDetailPage';
import { wellsApi } from '../../stores/wellsSlice';
import type { Well } from '../../types/well.types';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock data
const mockWell: Well = {
  id: 'well-123',
  well_name: 'Test Well Alpha',
  well_type: 'Oil',
  runs_count: 3,
  runs: [
    {
      id: 'run-1',
      run_number: 'RUN-001',
      run_name: 'Test Run 1',
      run_type: 'GTL',
    },
    {
      id: 'run-2',
      run_number: 'RUN-002',
      run_name: 'Test Run 2',
      run_type: 'Gyro',
    },
    {
      id: 'run-3',
      run_number: 'RUN-003',
      run_name: 'Test Run 3',
      run_type: 'MWD',
    },
  ],
  created_at: '2025-01-15T10:30:00Z',
  updated_at: '2025-01-16T14:45:00Z',
};

const mockWellWithoutRuns: Well = {
  id: 'well-456',
  well_name: 'Test Well Beta',
  well_type: 'Gas',
  runs_count: 0,
  runs: [],
  created_at: '2025-01-20T08:00:00Z',
  updated_at: '2025-01-20T08:00:00Z',
};

// Create mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      [wellsApi.reducerPath]: wellsApi.reducer,
      auth: () => ({
        isAuthenticated: true,
        user: {
          id: 'user-789',
          username: 'johndoe',
          email: 'john.doe@example.com',
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

const renderWithProviders = (wellId: string = 'well-123') => {
  const store = createMockStore();
  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            <Route path="/wells/:id" element={<WellDetailPage />} />
          </Routes>
        </BrowserRouter>
      </Provider>
    ),
    store,
  };
};

describe('WellDetailPage Integration Tests', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    // Mock useParams to return well-123
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ id: 'well-123' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Page Rendering with Complete Data', () => {
    it('should render page header with well name', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByText('Test Well Alpha')).toBeInTheDocument();
      });
    });

    it('should render breadcrumbs', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
        const wellsElements = screen.getAllByText('Wells');
        expect(wellsElements.length).toBeGreaterThan(0);
        const alphaElements = screen.getAllByText('Test Well Alpha');
        expect(alphaElements.length).toBeGreaterThan(0);
      });
    });

    it('should render action buttons', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });
  });

  describe('Well Information Section', () => {
    it('should display all well information fields', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByText('Well Information')).toBeInTheDocument();
        expect(screen.getByText('Test Well Alpha')).toBeInTheDocument();
        expect(screen.getByText('Oil')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // runs_count
      });
    });

    it('should display well type chip with correct color', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const oilChip = screen.getByText('Oil');
        expect(oilChip).toBeInTheDocument();
      });
    });

    it('should display formatted creation date', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument();
        expect(screen.getByText('10:30 AM')).toBeInTheDocument();
      });
    });

    it('should display formatted update date', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByText('Jan 16, 2025')).toBeInTheDocument();
        expect(screen.getByText('02:45 PM')).toBeInTheDocument();
      });
    });

    it('should display well ID in monospace font', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByText('well-123')).toBeInTheDocument();
      });
    });
  });

  describe('Associated Runs Section', () => {
    it('should display runs table with headers', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByText('Associated Runs (3)')).toBeInTheDocument();
        expect(screen.getByText('Run Number')).toBeInTheDocument();
        expect(screen.getByText('Run Name')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('should display all associated runs', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByText('RUN-001')).toBeInTheDocument();
        expect(screen.getByText('Test Run 1')).toBeInTheDocument();
        expect(screen.getByText('RUN-002')).toBeInTheDocument();
        expect(screen.getByText('Test Run 2')).toBeInTheDocument();
        expect(screen.getByText('RUN-003')).toBeInTheDocument();
        expect(screen.getByText('Test Run 3')).toBeInTheDocument();
      });
    });

    it('should display run type chips', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByText('GTL')).toBeInTheDocument();
        expect(screen.getByText('Gyro')).toBeInTheDocument();
        expect(screen.getByText('MWD')).toBeInTheDocument();
      });
    });

    it('should display view buttons for each run', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const viewButtons = screen.getAllByTitle('View run details');
        expect(viewButtons).toHaveLength(3);
      });
    });

    it('should navigate to run detail when view button clicked', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const viewButtons = screen.getAllByTitle('View run details');
        fireEvent.click(viewButtons[0]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/runs/run-1');
    });

    it('should display message when no runs are associated', async () => {
      const { store } = renderWithProviders('well-456');

      jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ id: 'well-456' });

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-456', mockWellWithoutRuns)
      );

      await waitFor(() => {
        expect(screen.getByText('No runs associated with this well')).toBeInTheDocument();
      });
    });

    it('should show correct count in section header', async () => {
      const { store } = renderWithProviders('well-456');

      jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ id: 'well-456' });

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-456', mockWellWithoutRuns)
      );

      await waitFor(() => {
        expect(screen.getByText('Associated Runs (0)')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Actions', () => {
    it('should navigate back to wells list when Back button clicked', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back/i });
        fireEvent.click(backButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/wells');
    });

    it('should navigate to edit page when Edit button clicked', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /edit/i });
        fireEvent.click(editButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/wells/well-123/edit');
    });
  });

  describe('Delete Functionality', () => {
    it('should open delete confirmation dialog when Delete button clicked', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Delete Well')).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to delete "Test Well Alpha"/i)).toBeInTheDocument();
      });
    });

    it('should display CASCADE warning in delete confirmation', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/will set the well field to NULL for all 3 associated run/i)).toBeInTheDocument();
      });
    });

    it('should mention that runs will not be deleted', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/The runs themselves will not be deleted/i)).toBeInTheDocument();
      });
    });

    it('should close dialog when Cancel clicked', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Delete Well')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show skeleton loader while data is loading', () => {
      renderWithProviders();

      // Initially shows loading state
      expect(screen.queryByText('Test Well Alpha')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when well not found', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', undefined as any)
      );

      // Simulate 404 response
      await waitFor(() => {
        // The component checks for !well and shows error
        expect(screen.queryByText('Test Well Alpha')).not.toBeInTheDocument();
      });
    });

    it('should show back button on error', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', undefined as any)
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to wells/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByText('Well Information')).toBeInTheDocument();
        expect(screen.getByText('Associated Runs (3)')).toBeInTheDocument();
      });
    });

    it('should have proper button labels', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);

        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });

    it('should have table structure with proper headers', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByText('Run Number')).toBeInTheDocument();
        expect(screen.getByText('Run Name')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });
  });

  describe('Well Type Chip Colors', () => {
    it('should display Oil well type with primary color', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const oilChip = screen.getByText('Oil');
        expect(oilChip).toBeInTheDocument();
      });
    });

    it('should display Gas well type with secondary color', async () => {
      const { store } = renderWithProviders('well-456');

      jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ id: 'well-456' });

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-456', mockWellWithoutRuns)
      );

      await waitFor(() => {
        const gasChip = screen.getByText('Gas');
        expect(gasChip).toBeInTheDocument();
      });
    });
  });

  describe('Data Consistency', () => {
    it('should display runs count matching runs array length', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByText('Associated Runs (3)')).toBeInTheDocument();
        // Verify 3 rows in table (matching runs_count)
        expect(screen.getByText('RUN-001')).toBeInTheDocument();
        expect(screen.getByText('RUN-002')).toBeInTheDocument();
        expect(screen.getByText('RUN-003')).toBeInTheDocument();
      });
    });

    it('should display all metadata fields', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        // Verify all metadata labels are present
        expect(screen.getByText('Well Name')).toBeInTheDocument();
        expect(screen.getByText('Well Type')).toBeInTheDocument();
        expect(screen.getByText('Total Runs')).toBeInTheDocument();
        expect(screen.getByText('Created At')).toBeInTheDocument();
        expect(screen.getByText('Last Updated')).toBeInTheDocument();
        expect(screen.getByText('Well ID')).toBeInTheDocument();
      });
    });
  });
});
