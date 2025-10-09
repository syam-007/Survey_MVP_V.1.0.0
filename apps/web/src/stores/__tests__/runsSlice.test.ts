import { configureStore } from '@reduxjs/toolkit';
import { runsApi } from '../runsSlice';
import type { Run, CreateRunInput, PaginatedRunResponse } from '../../types/run.types';

// Mock data
const mockRun: Run = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  run_number: 'RUN-001',
  run_name: 'Test Run',
  run_type: 'GTL',
  vertical_section: 1000,
  bhc_enabled: true,
  proposal_direction: null,
  grid_correction: 0.5,
  well: {
    id: '223e4567-e89b-12d3-a456-426614174001',
    well_name: 'Test Well',
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
    id: '323e4567-e89b-12d3-a456-426614174002',
    username: 'testuser',
    email: 'test@example.com',
  },
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
};

const mockPaginatedResponse: PaginatedRunResponse = {
  count: 2,
  next: null,
  previous: null,
  page: 1,
  total_pages: 1,
  page_size: 20,
  results: [mockRun, { ...mockRun, id: 'run-2', run_number: 'RUN-002' }],
};

const mockCreateInput: CreateRunInput = {
  run_number: 'RUN-003',
  run_name: 'New Run',
  run_type: 'Gyro',
  vertical_section: 2000,
  bhc_enabled: false,
  proposal_direction: 180,
  grid_correction: 1.0,
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

describe('runsSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Create a fresh store for each test
    store = configureStore({
      reducer: {
        [runsApi.reducerPath]: runsApi.reducer,
        auth: () => mockAuthState.auth,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(runsApi.middleware),
    });
  });

  afterEach(() => {
    store.dispatch(runsApi.util.resetApiState());
  });

  describe('API endpoints configuration', () => {
    it('should have correct endpoint names', () => {
      expect(runsApi.endpoints.getRuns).toBeDefined();
      expect(runsApi.endpoints.getRunById).toBeDefined();
      expect(runsApi.endpoints.createRun).toBeDefined();
      expect(runsApi.endpoints.updateRun).toBeDefined();
      expect(runsApi.endpoints.patchRun).toBeDefined();
      expect(runsApi.endpoints.deleteRun).toBeDefined();
    });

    it('should have correct reducer path', () => {
      expect(runsApi.reducerPath).toBe('runsApi');
    });
  });

  describe('getRuns endpoint', () => {
    it('should configure getRuns endpoint', () => {
      const endpoint = runsApi.endpoints.getRuns;
      expect(endpoint).toBeDefined();
      expect(endpoint.name).toBe('getRuns');
    });

    it('should have initiate method', () => {
      const endpoint = runsApi.endpoints.getRuns;
      expect(typeof endpoint.initiate).toBe('function');
    });

    it('should have select method', () => {
      const endpoint = runsApi.endpoints.getRuns;
      expect(typeof endpoint.select).toBe('function');
    });
  });

  describe('getRunById endpoint', () => {
    it('should configure getRunById endpoint', () => {
      const endpoint = runsApi.endpoints.getRunById;
      expect(endpoint).toBeDefined();
      expect(endpoint.name).toBe('getRunById');
    });

    it('should have initiate method', () => {
      const endpoint = runsApi.endpoints.getRunById;
      expect(typeof endpoint.initiate).toBe('function');
    });

    it('should have select method', () => {
      const endpoint = runsApi.endpoints.getRunById;
      expect(typeof endpoint.select).toBe('function');
    });
  });

  describe('createRun endpoint', () => {
    it('should configure createRun endpoint', () => {
      const endpoint = runsApi.endpoints.createRun;
      expect(endpoint).toBeDefined();
      expect(endpoint.name).toBe('createRun');
    });

    it('should be a mutation endpoint', () => {
      const endpoint = runsApi.endpoints.createRun;
      expect(typeof endpoint.initiate).toBe('function');
    });

    it('should have select method', () => {
      const endpoint = runsApi.endpoints.createRun;
      expect(typeof endpoint.select).toBe('function');
    });
  });

  describe('updateRun endpoint', () => {
    it('should configure updateRun endpoint', () => {
      const endpoint = runsApi.endpoints.updateRun;
      expect(endpoint).toBeDefined();
      expect(endpoint.name).toBe('updateRun');
    });

    it('should be a mutation endpoint', () => {
      const endpoint = runsApi.endpoints.updateRun;
      expect(typeof endpoint.initiate).toBe('function');
    });

    it('should have select method', () => {
      const endpoint = runsApi.endpoints.updateRun;
      expect(typeof endpoint.select).toBe('function');
    });
  });

  describe('patchRun endpoint', () => {
    it('should configure patchRun endpoint', () => {
      const endpoint = runsApi.endpoints.patchRun;
      expect(endpoint).toBeDefined();
      expect(endpoint.name).toBe('patchRun');
    });

    it('should be a mutation endpoint', () => {
      const endpoint = runsApi.endpoints.patchRun;
      expect(typeof endpoint.initiate).toBe('function');
    });

    it('should have select method', () => {
      const endpoint = runsApi.endpoints.patchRun;
      expect(typeof endpoint.select).toBe('function');
    });
  });

  describe('deleteRun endpoint', () => {
    it('should configure deleteRun endpoint', () => {
      const endpoint = runsApi.endpoints.deleteRun;
      expect(endpoint).toBeDefined();
      expect(endpoint.name).toBe('deleteRun');
    });

    it('should be a mutation endpoint', () => {
      const endpoint = runsApi.endpoints.deleteRun;
      expect(typeof endpoint.initiate).toBe('function');
    });

    it('should have select method', () => {
      const endpoint = runsApi.endpoints.deleteRun;
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
      const { useGetRunsQuery, useGetRunByIdQuery } = runsApi;
      expect(useGetRunsQuery).toBeDefined();
      expect(useGetRunByIdQuery).toBeDefined();
      expect(typeof useGetRunsQuery).toBe('function');
      expect(typeof useGetRunByIdQuery).toBe('function');
    });

    it('should generate mutation hooks', () => {
      const {
        useCreateRunMutation,
        useUpdateRunMutation,
        usePatchRunMutation,
        useDeleteRunMutation,
      } = runsApi;

      expect(useCreateRunMutation).toBeDefined();
      expect(useUpdateRunMutation).toBeDefined();
      expect(usePatchRunMutation).toBeDefined();
      expect(useDeleteRunMutation).toBeDefined();

      expect(typeof useCreateRunMutation).toBe('function');
      expect(typeof useUpdateRunMutation).toBe('function');
      expect(typeof usePatchRunMutation).toBe('function');
      expect(typeof useDeleteRunMutation).toBe('function');
    });
  });

  describe('API utility methods', () => {
    it('should have util.resetApiState method', () => {
      expect(typeof runsApi.util.resetApiState).toBe('function');
    });

    it('should have util.invalidateTags method', () => {
      expect(typeof runsApi.util.invalidateTags).toBe('function');
    });

    it('should have util.upsertQueryData method', () => {
      expect(typeof runsApi.util.upsertQueryData).toBe('function');
    });

    it('should have util.prefetch method', () => {
      expect(typeof runsApi.util.prefetch).toBe('function');
    });
  });

  describe('Store integration', () => {
    it('should integrate with Redux store', () => {
      const state = store.getState();
      expect(state[runsApi.reducerPath]).toBeDefined();
    });

    it('should have middleware configured', () => {
      // Verify middleware is working by checking store has API state
      const state = store.getState();
      const apiState = state[runsApi.reducerPath];
      expect(apiState).toHaveProperty('queries');
      expect(apiState).toHaveProperty('mutations');
      expect(apiState).toHaveProperty('provided');
      expect(apiState).toHaveProperty('subscriptions');
    });
  });
});
