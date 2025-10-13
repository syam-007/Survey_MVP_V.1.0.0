import * as React from 'react';
import { render } from '@testing-library/react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { WellAutocomplete } from '../wells/WellAutocomplete';
import { wellsApi } from '../../stores/wellsSlice';
import type { Well } from '../../types/well.types';

// Mock data
const mockWells: Well[] = [
  {
    id: 'well-1',
    well_name: 'Well Alpha',
    well_type: 'Oil',
    runs_count: 5,
    runs: [],
    created_at: '2025-01-15T10:30:00Z',
    updated_at: '2025-01-16T14:45:00Z',
  },
  {
    id: 'well-2',
    well_name: 'Well Beta',
    well_type: 'Gas',
    runs_count: 3,
    runs: [],
    created_at: '2025-01-15T11:00:00Z',
    updated_at: '2025-01-16T15:00:00Z',
  },
  {
    id: 'well-3',
    well_name: 'Well Gamma',
    well_type: 'Water',
    runs_count: 2,
    runs: [],
    created_at: '2025-01-15T12:00:00Z',
    updated_at: '2025-01-16T16:00:00Z',
  },
];

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

const mockOnChange = jest.fn();

const renderWithProviders = (props = {}) => {
  const store = createMockStore();
  return {
    ...render(
      <Provider store={store}>
        <WellAutocomplete
          value={null}
          onChange={mockOnChange}
          {...props}
        />
      </Provider>
    ),
    store,
  };
};

describe('WellAutocomplete Component Tests', () => {
  beforeEach(() => {
    mockOnChange.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render autocomplete input field', () => {
      renderWithProviders();

      expect(screen.getByLabelText(/well/i)).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      renderWithProviders({ label: 'Select Well' });

      expect(screen.getByLabelText(/select well/i)).toBeInTheDocument();
    });

    it('should render with required prop', () => {
      renderWithProviders({ required: true });

      const input = screen.getByLabelText(/well/i);
      expect(input).toBeRequired();
    });

    it('should render with error state', () => {
      renderWithProviders({ error: true, helperText: 'Well is required' });

      expect(screen.getByText('Well is required')).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('should display loading state initially', () => {
      renderWithProviders();

      // Initially no options text should show when input is focused
      const input = screen.getByLabelText(/well/i);
      fireEvent.focus(input);

      // Should show "Start typing to search wells" when no search
      expect(screen.queryByText(/start typing to search wells/i)).toBeInTheDocument();
    });

    it('should load and display well options', async () => {
      const { store } = renderWithProviders();

      // Mock wells data
      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', { page_size: 20 }, {
          count: 3,
          next: null,
          previous: null,
          page: 1,
          total_pages: 1,
          page_size: 20,
          results: mockWells,
        })
      );

      const input = screen.getByLabelText(/well/i);
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Well' } });

      await waitFor(() => {
        expect(screen.queryByText(/start typing to search wells/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should update input value on user input', () => {
      renderWithProviders();

      const input = screen.getByLabelText(/well/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Alpha' } });

      expect(input.value).toBe('Alpha');
    });

    it('should display no options message when search has no results', async () => {
      const { store } = renderWithProviders();

      // Mock empty results
      store.dispatch(
        wellsApi.util.upsertQueryData('getWells', { page_size: 20, search: 'NonExistent' }, {
          count: 0,
          next: null,
          previous: null,
          page: 1,
          total_pages: 0,
          page_size: 20,
          results: [],
        })
      );

      const input = screen.getByLabelText(/well/i);
      fireEvent.change(input, { target: { value: 'NonExistent' } });

      await waitFor(() => {
        expect(screen.queryByText(/no wells found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Selection Behavior', () => {
    it('should display selected well value', () => {
      const selectedWell = mockWells[0];
      renderWithProviders({ value: selectedWell });

      const input = screen.getByLabelText(/well/i) as HTMLInputElement;
      expect(input.value).toBe('Well Alpha');
    });

    it('should be disabled when disabled prop is true', () => {
      renderWithProviders({ disabled: true });

      const input = screen.getByLabelText(/well/i);
      expect(input).toBeDisabled();
    });
  });
});
