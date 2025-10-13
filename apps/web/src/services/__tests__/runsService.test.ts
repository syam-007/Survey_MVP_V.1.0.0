import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import type { Run, CreateRunInput, PaginatedRunResponse } from '../../types/run.types';

// Mock authService - MUST be before service imports!
const mockGetAccessToken = jest.fn(() => 'mock-access-token');
const mockRefreshAccessToken = jest.fn();

jest.mock('../authService', () => ({
  default: {
    getAccessToken: mockGetAccessToken,
    refreshAccessToken: mockRefreshAccessToken,
  },
}));

// Import services AFTER mocks
import runsService from '../runsService';
import authService from '../authService';

describe('RunsService', () => {
  let mockAxios: InstanceType<typeof MockAdapter>;
  const API_BASE_URL = 'http://localhost:8000';

  // Sample test data
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
    count: 1,
    next: null,
    previous: null,
    page: 1,
    total_pages: 1,
    page_size: 20,
    results: [mockRun],
  };

  const mockCreateInput: CreateRunInput = {
    run_number: 'RUN-002',
    run_name: 'New Run',
    run_type: 'Gyro',
    vertical_section: 2000,
    bhc_enabled: false,
    proposal_direction: 180,
    grid_correction: 1.0,
  };

  beforeEach(() => {
    // Create a new mock adapter for the runsService axios instance
    mockAxios = new MockAdapter(runsService.getAxiosInstance());
    // Note: authService mocks not needed - interceptors disabled in test environment
  });

  afterEach(() => {
    mockAxios.reset();
    mockAxios.restore();
    jest.clearAllMocks();
  });

  describe('getRuns', () => {
    it('should fetch runs without filters', async () => {
      mockAxios.onGet(`${API_BASE_URL}/api/v1/runs/?`).reply(200, mockPaginatedResponse);

      const result = await runsService.getRuns();

      expect(result).toEqual(mockPaginatedResponse);
      expect(result.count).toBe(1);
      expect(result.results).toHaveLength(1);
    });

    it('should fetch runs with filters', async () => {
      const filters = {
        run_type: 'GTL' as const,
        search: 'test',
        page: 1,
        page_size: 20,
        ordering: '-created_at' as const,
      };

      mockAxios
        .onGet(/\/api\/v1\/runs\/.*/)
        .reply((config) => {
          const params = new URLSearchParams(config.url?.split('?')[1]);
          expect(params.get('run_type')).toBe('GTL');
          expect(params.get('search')).toBe('test');
          expect(params.get('page')).toBe('1');
          expect(params.get('page_size')).toBe('20');
          expect(params.get('ordering')).toBe('-created_at');
          return [200, mockPaginatedResponse];
        });

      const result = await runsService.getRuns(filters);

      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle 404 error when fetching runs', async () => {
      mockAxios.onGet(/\/api\/v1\/runs\/.*/).reply(404);

      await expect(runsService.getRuns()).rejects.toThrow('Run not found');
    });

    it('should handle network error', async () => {
      mockAxios.onGet(/\/api\/v1\/runs\/.*/).networkError();

      await expect(runsService.getRuns()).rejects.toThrow(
        /Network Error|Cannot connect to server/
      );
    });
  });

  describe('getRunById', () => {
    it('should fetch a single run by ID', async () => {
      mockAxios
        .onGet(`${API_BASE_URL}/api/v1/runs/${mockRun.id}/`)
        .reply(200, mockRun);

      const result = await runsService.getRunById(mockRun.id);

      expect(result).toEqual(mockRun);
      expect(result.id).toBe(mockRun.id);
      expect(result.run_number).toBe('RUN-001');
    });

    it('should handle 404 error when run not found', async () => {
      const nonExistentId = 'non-existent-id';
      mockAxios
        .onGet(`${API_BASE_URL}/api/v1/runs/${nonExistentId}/`)
        .reply(404);

      await expect(runsService.getRunById(nonExistentId)).rejects.toThrow(
        'Run not found'
      );
    });
  });

  describe('createRun', () => {
    it('should create a new run', async () => {
      const createdRun = { ...mockRun, ...mockCreateInput };
      mockAxios.onPost(`${API_BASE_URL}/api/v1/runs/`).reply(201, createdRun);

      const result = await runsService.createRun(mockCreateInput);

      expect(result).toEqual(createdRun);
      expect(result.run_number).toBe('RUN-002');
      expect(result.run_name).toBe('New Run');
    });

    it('should handle validation errors', async () => {
      mockAxios.onPost(`${API_BASE_URL}/api/v1/runs/`).reply(400, {
        errors: {
          run_number: ['This field is required'],
          run_type: ['Invalid run type'],
        },
      });

      await expect(runsService.createRun(mockCreateInput)).rejects.toThrow(
        'run_number: This field is required; run_type: Invalid run type'
      );
    });

    it('should handle 401 unauthorized error', async () => {
      mockAxios.onPost(`${API_BASE_URL}/api/v1/runs/`).reply(401);

      await expect(runsService.createRun(mockCreateInput)).rejects.toThrow(
        'You must be logged in to perform this action'
      );
    });

    it('should handle 403 forbidden error', async () => {
      mockAxios.onPost(`${API_BASE_URL}/api/v1/runs/`).reply(403);

      await expect(runsService.createRun(mockCreateInput)).rejects.toThrow(
        'You do not have permission to perform this action'
      );
    });
  });

  describe('updateRun', () => {
    it('should update an existing run', async () => {
      const updatedRun = { ...mockRun, run_name: 'Updated Run' };
      mockAxios
        .onPut(`${API_BASE_URL}/api/v1/runs/${mockRun.id}/`)
        .reply(200, updatedRun);

      const result = await runsService.updateRun(mockRun.id, mockCreateInput);

      expect(result).toEqual(updatedRun);
      expect(result.run_name).toBe('Updated Run');
    });

    it('should handle 404 error when updating non-existent run', async () => {
      const nonExistentId = 'non-existent-id';
      mockAxios
        .onPut(`${API_BASE_URL}/api/v1/runs/${nonExistentId}/`)
        .reply(404);

      await expect(
        runsService.updateRun(nonExistentId, mockCreateInput)
      ).rejects.toThrow('Run not found');
    });
  });

  describe('patchRun', () => {
    it('should partially update a run', async () => {
      const patchData = { run_name: 'Patched Run' };
      const patchedRun = { ...mockRun, ...patchData };
      mockAxios
        .onPatch(`${API_BASE_URL}/api/v1/runs/${mockRun.id}/`)
        .reply(200, patchedRun);

      const result = await runsService.patchRun(mockRun.id, patchData);

      expect(result).toEqual(patchedRun);
      expect(result.run_name).toBe('Patched Run');
    });

    it('should handle validation errors in patch', async () => {
      mockAxios.onPatch(`${API_BASE_URL}/api/v1/runs/${mockRun.id}/`).reply(400, {
        errors: {
          run_type: ['Invalid run type'],
        },
      });

      await expect(runsService.patchRun(mockRun.id, { run_type: 'Invalid' as any })).rejects.toThrow(
        'run_type: Invalid run type'
      );
    });
  });

  describe('deleteRun', () => {
    it('should soft delete a run', async () => {
      mockAxios
        .onDelete(`${API_BASE_URL}/api/v1/runs/${mockRun.id}/`)
        .reply(204);

      await expect(runsService.deleteRun(mockRun.id)).resolves.not.toThrow();
    });

    it('should handle 404 error when deleting non-existent run', async () => {
      const nonExistentId = 'non-existent-id';
      mockAxios
        .onDelete(`${API_BASE_URL}/api/v1/runs/${nonExistentId}/`)
        .reply(404);

      await expect(runsService.deleteRun(nonExistentId)).rejects.toThrow(
        'Run not found'
      );
    });

    it('should handle 403 forbidden error', async () => {
      mockAxios
        .onDelete(`${API_BASE_URL}/api/v1/runs/${mockRun.id}/`)
        .reply(403);

      await expect(runsService.deleteRun(mockRun.id)).rejects.toThrow(
        'You do not have permission to perform this action'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle 500 server error', async () => {
      mockAxios.onGet(`${API_BASE_URL}/api/v1/runs/?`).reply(500);

      await expect(runsService.getRuns()).rejects.toThrow(
        'Server error. Please try again later'
      );
    });

    it('should handle errors with custom message', async () => {
      mockAxios.onGet(`${API_BASE_URL}/api/v1/runs/?`).reply(400, {
        message: 'Custom error message',
      });

      await expect(runsService.getRuns()).rejects.toThrow('Custom error message');
    });

    // Note: JWT token handling tests skipped - interceptors are disabled in test environment
    // to allow MockAdapter to work properly. JWT token handling is tested in integration tests.

    it.skip('should include access token in request headers', async () => {
      // Skipped: Interceptors disabled in test mode
    });
  });

  describe('Token Refresh', () => {
    // Note: Token refresh tests skipped - interceptors are disabled in test environment
    // to allow MockAdapter to work properly. Token refresh is tested in integration tests.

    it.skip('should refresh token on 401 and retry request', async () => {
      // Skipped: Interceptors disabled in test mode
    });

    it.skip('should throw error if token refresh fails', async () => {
      // Skipped: Interceptors disabled in test mode
    });
  });
});
