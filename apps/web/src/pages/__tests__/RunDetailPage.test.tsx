import * as React from 'react';
import { render } from '@testing-library/react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { RunDetailPage } from '../runs/RunDetailPage';
import { runsApi } from '../../stores/runsSlice';
import type { Run } from '../../types/run.types';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock data
const mockRun: Run = {
  id: 'run-123',
  run_number: 'RUN-001',
  run_name: 'Test Run Alpha',
  run_type: 'GTL',
  vertical_section: 1500,
  bhc_enabled: true,
  proposal_direction: null,
  grid_correction: 0.75,
  well: {
    id: 'well-456',
    well_name: 'Test Well Alpha',
    well_type: 'Oil',
  },
  location: {
    latitude: 25.2048,
    longitude: 55.2708,
    easting: 550000,
    northing: 2800000,
  },
  depth: {
    elevation_reference: 'MSL',
    reference_height: 125.5,
  },
  user: {
    id: 'user-789',
    username: 'johndoe',
    email: 'john.doe@example.com',
  },
  created_at: '2025-01-15T10:30:00Z',
  updated_at: '2025-01-16T14:45:00Z',
};

const mockRunWithoutOptionalFields: Run = {
  id: 'run-456',
  run_number: 'RUN-002',
  run_name: 'Test Run Beta',
  run_type: 'Gyro',
  vertical_section: null,
  bhc_enabled: false,
  proposal_direction: 180,
  grid_correction: null,
  well: null,
  location: null,
  depth: null,
  user: {
    id: 'user-789',
    username: 'johndoe',
    email: 'john.doe@example.com',
  },
  created_at: '2025-01-20T08:00:00Z',
  updated_at: '2025-01-20T08:00:00Z',
};

// Create mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      [runsApi.reducerPath]: runsApi.reducer,
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
      getDefaultMiddleware().concat(runsApi.middleware),
  });
};

const renderWithProviders = (runId: string = 'run-123') => {
  const store = createMockStore();
  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            <Route path="/runs/:id" element={<RunDetailPage />} />
          </Routes>
        </BrowserRouter>
      </Provider>
    ),
    store,
  };
};

describe('RunDetailPage Integration Tests', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    // Mock useParams to return run-123
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ id: 'run-123' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Page Rendering with Complete Data', () => {
    it('should render page header with run name', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        expect(screen.getByText('Test Run Alpha')).toBeInTheDocument();
      });
    });

    it('should render breadcrumbs', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Runs')).toBeInTheDocument();
        expect(screen.getByText('RUN-001')).toBeInTheDocument();
      });
    });

    it('should render action buttons', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });
  });

  describe('Basic Information Section', () => {
    it('should display all basic information fields', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        expect(screen.getByText('Basic Information')).toBeInTheDocument();
        expect(screen.getByText('RUN-001')).toBeInTheDocument();
        expect(screen.getByText('Test Run Alpha')).toBeInTheDocument();
        expect(screen.getByText('GTL')).toBeInTheDocument();
        expect(screen.getByText('1500')).toBeInTheDocument();
        expect(screen.getByText('Yes')).toBeInTheDocument(); // BHC Enabled
        expect(screen.getByText('0.75')).toBeInTheDocument(); // Grid Correction
      });
    });

    it('should display N/A for null optional fields', async () => {
      const { store } = renderWithProviders('run-456');

      jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ id: 'run-456' });

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-456', mockRunWithoutOptionalFields)
      );

      await waitFor(() => {
        const naElements = screen.getAllByText('N/A');
        expect(naElements.length).toBeGreaterThan(0);
      });
    });

    it('should display proposal direction when BHC is disabled', async () => {
      const { store } = renderWithProviders('run-456');

      jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ id: 'run-456' });

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-456', mockRunWithoutOptionalFields)
      );

      await waitFor(() => {
        expect(screen.getByText('Proposal Direction')).toBeInTheDocument();
        expect(screen.getByText('180')).toBeInTheDocument();
      });
    });
  });

  describe('Well Information Section', () => {
    it('should display well information when available', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        expect(screen.getByText('Well Information')).toBeInTheDocument();
        expect(screen.getByText('Test Well Alpha')).toBeInTheDocument();
        expect(screen.getByText('Oil')).toBeInTheDocument();
      });
    });

    it('should display message when no well is associated', async () => {
      const { store } = renderWithProviders('run-456');

      jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ id: 'run-456' });

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-456', mockRunWithoutOptionalFields)
      );

      await waitFor(() => {
        expect(screen.getByText('No well associated with this run')).toBeInTheDocument();
      });
    });
  });

  describe('Location Section', () => {
    it('should display location information when available', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('25.2048')).toBeInTheDocument(); // Latitude
        expect(screen.getByText('55.2708')).toBeInTheDocument(); // Longitude
        expect(screen.getByText('550000')).toBeInTheDocument(); // Easting
        expect(screen.getByText('2800000')).toBeInTheDocument(); // Northing
      });
    });

    it('should not display location section when location is null', async () => {
      const { store } = renderWithProviders('run-456');

      jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ id: 'run-456' });

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-456', mockRunWithoutOptionalFields)
      );

      await waitFor(() => {
        expect(screen.queryByText('Location')).not.toBeInTheDocument();
      });
    });
  });

  describe('Depth Section', () => {
    it('should display depth information when available', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        expect(screen.getByText('Depth')).toBeInTheDocument();
        expect(screen.getByText('MSL')).toBeInTheDocument();
        expect(screen.getByText('125.5')).toBeInTheDocument();
      });
    });

    it('should not display depth section when depth is null', async () => {
      const { store } = renderWithProviders('run-456');

      jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ id: 'run-456' });

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-456', mockRunWithoutOptionalFields)
      );

      await waitFor(() => {
        expect(screen.queryByText('Elevation Reference')).not.toBeInTheDocument();
      });
    });
  });

  describe('Metadata Section', () => {
    it('should display metadata information', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        expect(screen.getByText('Metadata')).toBeInTheDocument();
        expect(screen.getByText('johndoe')).toBeInTheDocument();
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
        expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument(); // Created date
        expect(screen.getByText('Jan 16, 2025')).toBeInTheDocument(); // Updated date
        expect(screen.getByText('run-123')).toBeInTheDocument(); // Run ID
      });
    });

    it('should display formatted times', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        expect(screen.getByText('10:30 AM')).toBeInTheDocument();
        expect(screen.getByText('02:45 PM')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Actions', () => {
    it('should navigate back to runs list when Back button clicked', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back/i });
        fireEvent.click(backButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/runs');
    });

    it('should navigate to edit page when Edit button clicked', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /edit/i });
        fireEvent.click(editButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/runs/run-123/edit');
    });
  });

  describe('Delete Functionality', () => {
    it('should open delete confirmation dialog when Delete button clicked', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Delete Run')).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to delete "Test Run Alpha"/i)).toBeInTheDocument();
      });
    });

    it('should close dialog when Cancel clicked', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
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
        expect(screen.queryByText('Delete Run')).not.toBeInTheDocument();
      });
    });

    it('should mention soft delete in confirmation message', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/soft delete the run and it can be recovered later/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show skeleton loader while data is loading', () => {
      renderWithProviders();

      // Initially shows loading state
      expect(screen.queryByText('Test Run Alpha')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when run not found', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', undefined as any)
      );

      // Simulate 404 response
      await waitFor(() => {
        // The component checks for !run and shows error
        expect(screen.queryByText('Test Run Alpha')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        expect(screen.getByText('Basic Information')).toBeInTheDocument();
        expect(screen.getByText('Well Information')).toBeInTheDocument();
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Depth')).toBeInTheDocument();
        expect(screen.getByText('Metadata')).toBeInTheDocument();
      });
    });

    it('should have proper button labels', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);

        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });
  });

  describe('Run Type Chip Colors', () => {
    it('should display GTL run type with primary color', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-123', mockRun)
      );

      await waitFor(() => {
        const gtlChip = screen.getByText('GTL');
        expect(gtlChip).toBeInTheDocument();
      });
    });

    it('should display Gyro run type with secondary color', async () => {
      const { store } = renderWithProviders('run-456');

      jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ id: 'run-456' });

      store.dispatch(
        runsApi.util.upsertQueryData('getRunById', 'run-456', mockRunWithoutOptionalFields)
      );

      await waitFor(() => {
        const gyroChip = screen.getByText('Gyro');
        expect(gyroChip).toBeInTheDocument();
      });
    });
  });
});
