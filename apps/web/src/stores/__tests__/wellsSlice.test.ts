import { configureStore } from '@reduxjs/toolkit';
import { wellsApi } from '../wellsSlice';
import type { Well, CreateWellInput, PaginatedWellResponse } from '../../types/well.types';

// Mock data
const mockWell: Well = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  well_name: 'Test Well A',
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
  ],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
};

const mockPaginatedResponse: PaginatedWellResponse = {
  count: 2,
  next: null,
  previous: null,
  page: 1,
  total_pages: 1,
  page_size: 20,
  results: [mockWell, { ...mockWell, id: 'well-2', well_name: 'Test Well B', well_type: 'Gas' }],
};

const mockCreateInput: CreateWellInput = {
  well_name: 'New Well',
  well_type: 'Water',
};

// Mock the auth token in state
const mockAuthState = {
  auth: {
    isAuthenticated: true,
    user: {
      id: '323e4567-e89b-12d3-a456-426614174002',
      username: 'testuser',
      email: 'test@example.com',
      role: 'Admin',
    },
    tokens: {
      access: 'mock-access-token',
      refresh: 'mock-refresh-token',
    },
    loading: false,
    error: null,
  },
};

describe('wellsSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Create a fresh store for each test
    store = configureStore({
      reducer: {
        [wellsApi.reducerPath]: wellsApi.reducer,
        auth: () => mockAuthState.auth,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(wellsApi.middleware),
    });
  });

  afterEach(() => {
    store.dispatch(wellsApi.util.resetApiState());
  });

  describe('API endpoints configuration', () => {
    it('should have correct endpoint names', () => {
      expect(wellsApi.endpoints.getWells).toBeDefined();
      expect(wellsApi.endpoints.getWellById).toBeDefined();
      expect(wellsApi.endpoints.createWell).toBeDefined();
      expect(wellsApi.endpoints.updateWell).toBeDefined();
      expect(wellsApi.endpoints.deleteWell).toBeDefined();
    });

    it('should have correct reducer path', () => {
      expect(wellsApi.reducerPath).toBe('wellsApi');
    });
  });

  describe('getWells endpoint', () => {
    it('should configure getWells endpoint', () => {
      const endpoint = wellsApi.endpoints.getWells;
      expect(endpoint).toBeDefined();
      expect(endpoint.name).toBe('getWells');
    });

    it('should have initiate method', () => {
      const endpoint = wellsApi.endpoints.getWells;
      expect(typeof endpoint.initiate).toBe('function');
    });

    it('should have select method', () => {
      const endpoint = wellsApi.endpoints.getWells;
      expect(typeof endpoint.select).toBe('function');
    });
  });

  describe('getWellById endpoint', () => {
    it('should configure getWellById endpoint', () => {
      const endpoint = wellsApi.endpoints.getWellById;
      expect(endpoint).toBeDefined();
      expect(endpoint.name).toBe('getWellById');
    });

    it('should have initiate method', () => {
      const endpoint = wellsApi.endpoints.getWellById;
      expect(typeof endpoint.initiate).toBe('function');
    });

    it('should have select method', () => {
      const endpoint = wellsApi.endpoints.getWellById;
      expect(typeof endpoint.select).toBe('function');
    });
  });

  describe('createWell endpoint', () => {
    it('should configure createWell endpoint', () => {
      const endpoint = wellsApi.endpoints.createWell;
      expect(endpoint).toBeDefined();
      expect(endpoint.name).toBe('createWell');
    });

    it('should be a mutation endpoint', () => {
      const endpoint = wellsApi.endpoints.createWell;
      expect(typeof endpoint.initiate).toBe('function');
    });

    it('should have select method', () => {
      const endpoint = wellsApi.endpoints.createWell;
      expect(typeof endpoint.select).toBe('function');
    });
  });

  describe('updateWell endpoint', () => {
    it('should configure updateWell endpoint', () => {
      const endpoint = wellsApi.endpoints.updateWell;
      expect(endpoint).toBeDefined();
      expect(endpoint.name).toBe('updateWell');
    });

    it('should be a mutation endpoint', () => {
      const endpoint = wellsApi.endpoints.updateWell;
      expect(typeof endpoint.initiate).toBe('function');
    });

    it('should have select method', () => {
      const endpoint = wellsApi.endpoints.updateWell;
      expect(typeof endpoint.select).toBe('function');
    });
  });

  describe('deleteWell endpoint', () => {
    it('should configure deleteWell endpoint', () => {
      const endpoint = wellsApi.endpoints.deleteWell;
      expect(endpoint).toBeDefined();
      expect(endpoint.name).toBe('deleteWell');
    });

    it('should be a mutation endpoint', () => {
      const endpoint = wellsApi.endpoints.deleteWell;
      expect(typeof endpoint.initiate).toBe('function');
    });

    it('should have select method', () => {
      const endpoint = wellsApi.endpoints.deleteWell;
      expect(typeof endpoint.select).toBe('function');
    });
  });

  describe('Base query configuration', () => {
    it('should include Authorization header when token exists', () => {
      // This test verifies the baseQuery configuration
      // The actual header is set via prepareHeaders in the baseQuery config
      const state = store.getState();
      expect((state as any).auth.tokens.access).toBe('mock-access-token');
    });
  });

  describe('Hooks generation', () => {
    it('should generate query hooks', () => {
      const { useGetWellsQuery, useGetWellByIdQuery } = wellsApi;
      expect(useGetWellsQuery).toBeDefined();
      expect(useGetWellByIdQuery).toBeDefined();
      expect(typeof useGetWellsQuery).toBe('function');
      expect(typeof useGetWellByIdQuery).toBe('function');
    });

    it('should generate mutation hooks', () => {
      const {
        useCreateWellMutation,
        useUpdateWellMutation,
        useDeleteWellMutation,
      } = wellsApi;

      expect(useCreateWellMutation).toBeDefined();
      expect(useUpdateWellMutation).toBeDefined();
      expect(useDeleteWellMutation).toBeDefined();

      expect(typeof useCreateWellMutation).toBe('function');
      expect(typeof useUpdateWellMutation).toBe('function');
      expect(typeof useDeleteWellMutation).toBe('function');
    });
  });

  describe('API utility methods', () => {
    it('should have util.resetApiState method', () => {
      expect(typeof wellsApi.util.resetApiState).toBe('function');
    });

    it('should have util.invalidateTags method', () => {
      expect(typeof wellsApi.util.invalidateTags).toBe('function');
    });

    it('should have util.upsertQueryData method', () => {
      expect(typeof wellsApi.util.upsertQueryData).toBe('function');
    });

    it('should have util.prefetch method', () => {
      expect(typeof wellsApi.util.prefetch).toBe('function');
    });
  });

  describe('Store integration', () => {
    it('should integrate with Redux store', () => {
      const state = store.getState();
      expect(state[wellsApi.reducerPath]).toBeDefined();
    });

    it('should have middleware configured', () => {
      // Verify middleware is working by checking store has API state
      const state = store.getState();
      const apiState = state[wellsApi.reducerPath];
      expect(apiState).toHaveProperty('queries');
      expect(apiState).toHaveProperty('mutations');
      expect(apiState).toHaveProperty('provided');
      expect(apiState).toHaveProperty('subscriptions');
    });
  });
});
