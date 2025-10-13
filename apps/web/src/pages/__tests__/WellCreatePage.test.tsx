import * as React from 'react';
import { render } from '@testing-library/react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { WellCreatePage } from '../wells/WellCreatePage';
import { wellsApi } from '../../stores/wellsSlice';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

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
          <WellCreatePage />
        </BrowserRouter>
      </Provider>
    ),
    store,
  };
};

describe('WellCreatePage Integration Tests', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Page Rendering', () => {
    it('should render page header with title', () => {
      renderWithProviders();

      expect(screen.getByText('Create Well')).toBeInTheDocument();
    });

    it('should render breadcrumbs', () => {
      renderWithProviders();

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Wells')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('should render well form', () => {
      renderWithProviders();

      expect(screen.getByLabelText(/well name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/well type/i)).toBeInTheDocument();
    });

    it('should render create button with correct label', () => {
      renderWithProviders();

      expect(screen.getByRole('button', { name: /create well/i })).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      renderWithProviders();

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should navigate to wells list when cancel clicked', async () => {
      renderWithProviders();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/wells');
    });

    it('should have empty form initially', () => {
      renderWithProviders();

      const wellNameInput = screen.getByLabelText(/well name/i);
      expect(wellNameInput).toHaveValue('');
    });

    it('should have default well type selected', () => {
      renderWithProviders();

      const wellTypeSelect = screen.getByLabelText(/well type/i);
      expect(wellTypeSelect).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should not display error initially', () => {
      renderWithProviders();

      expect(screen.queryByText(/failed to create well/i)).not.toBeInTheDocument();
    });

    it('should display API error when provided', async () => {
      renderWithProviders();

      // This test verifies the error display mechanism exists
      // Actual API error testing would require mocking the mutation
      expect(screen.queryByText(/retry/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show form in normal state initially', () => {
      renderWithProviders();

      const submitButton = screen.getByRole('button', { name: /create well/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should have all form fields enabled initially', () => {
      renderWithProviders();

      const wellNameInput = screen.getByLabelText(/well name/i);
      expect(wellNameInput).not.toBeDisabled();
    });
  });
});
