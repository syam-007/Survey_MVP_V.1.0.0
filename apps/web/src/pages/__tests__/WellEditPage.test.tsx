import * as React from 'react';
import { render } from '@testing-library/react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { WellEditPage } from '../wells/WellEditPage';
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
  runs: [],
  created_at: '2025-01-15T10:30:00Z',
  updated_at: '2025-01-16T14:45:00Z',
};

// Create mock store
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

const renderWithProviders = () => {
  const store = createMockStore();
  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            <Route path="/wells/:id/edit" element={<WellEditPage />} />
          </Routes>
        </BrowserRouter>
      </Provider>
    ),
    store,
  };
};

describe('WellEditPage Integration Tests', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    // Mock useParams to return well-123
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ id: 'well-123' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Page Rendering with Well Data', () => {
    it('should render page header with title', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Well')).toBeInTheDocument();
      });
    });

    it('should render breadcrumbs with well name', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Wells')).toBeInTheDocument();
        expect(screen.getByText('Test Well Alpha')).toBeInTheDocument();
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });
    });

    it('should render well form', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/well name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/well type/i)).toBeInTheDocument();
      });
    });

    it('should pre-populate form with well data', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const wellNameInput = screen.getByLabelText(/well name/i);
        expect(wellNameInput).toHaveValue('Test Well Alpha');
      });
    });

    it('should render update button with correct label', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update well/i })).toBeInTheDocument();
      });
    });

    it('should render cancel button', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Interaction', () => {
    it('should navigate to detail page when cancel clicked', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/wells/well-123');
    });

    it('should display well type value from data', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const wellTypeSelect = screen.getByLabelText(/well type/i);
        expect(wellTypeSelect).toHaveTextContent('Oil');
      });
    });
  });

  describe('Loading State', () => {
    it('should show skeleton loader while data is loading', () => {
      renderWithProviders();

      // Initially shows loading state
      expect(screen.queryByText('Edit Well')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error when well not found', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', undefined as any)
      );

      await waitFor(() => {
        expect(screen.getByText(/well not found/i)).toBeInTheDocument();
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

    it('should navigate back when back button clicked on error', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', undefined as any)
      );

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back to wells/i });
        fireEvent.click(backButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/wells');
    });

    it('should not display API error initially', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        expect(screen.queryByText(/failed to update well/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form State', () => {
    it('should have form fields enabled when not updating', async () => {
      const { store } = renderWithProviders();

      store.dispatch(
        wellsApi.util.upsertQueryData('getWellById', 'well-123', mockWell)
      );

      await waitFor(() => {
        const wellNameInput = screen.getByLabelText(/well name/i);
        expect(wellNameInput).not.toBeDisabled();
      });
    });
  });
});
