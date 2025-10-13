import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import type { Well, CreateWellInput, PaginatedWellResponse } from '../../types/well.types';

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
import wellsService from '../wellsService';
import authService from '../authService';

describe('WellsService', () => {
  let mockAxios: InstanceType<typeof MockAdapter>;
  const API_BASE_URL = 'http://localhost:8000';

  // Sample test data
  const mockWell: Well = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    well_name: 'Test Well',
    well_type: 'Oil',
    runs_count: 2,
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
    count: 1,
    next: null,
    previous: null,
    page: 1,
    total_pages: 1,
    page_size: 20,
    results: [mockWell],
  };

  const mockCreateInput: CreateWellInput = {
    well_name: 'New Well',
    well_type: 'Gas',
  };

  beforeEach(() => {
    // Create a new mock adapter for the wellsService axios instance
    mockAxios = new MockAdapter(wellsService.getAxiosInstance());
    // Note: authService mocks not needed - interceptors disabled in test environment
  });

  afterEach(() => {
    mockAxios.restore();
    jest.clearAllMocks();
  });

  describe('getWells', () => {
    it('should fetch wells without filters', async () => {
      mockAxios.onGet(`${API_BASE_URL}/api/v1/wells/?`).reply(200, mockPaginatedResponse);

      const result = await wellsService.getWells();

      expect(result).toEqual(mockPaginatedResponse);
      expect(result.count).toBe(1);
      expect(result.results).toHaveLength(1);
    });

    it('should fetch wells with filters', async () => {
      const filters = {
        well_type: 'Oil' as const,
        search: 'test',
        page: 1,
        page_size: 20,
        ordering: '-created_at' as const,
      };

      mockAxios
        .onGet(/\/api\/v1\/wells\/.*/)
        .reply((config) => {
          const params = new URLSearchParams(config.url?.split('?')[1]);
          expect(params.get('well_type')).toBe('Oil');
          expect(params.get('search')).toBe('test');
          expect(params.get('page')).toBe('1');
          expect(params.get('page_size')).toBe('20');
          expect(params.get('ordering')).toBe('-created_at');
          return [200, mockPaginatedResponse];
        });

      const result = await wellsService.getWells(filters);

      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle 404 error when fetching wells', async () => {
      mockAxios.onGet(/\/api\/v1\/wells\/.*/).reply(404);

      await expect(wellsService.getWells()).rejects.toThrow('Well not found');
    });

    it('should handle network error', async () => {
      mockAxios.onGet(/\/api\/v1\/wells\/.*/).networkError();

      await expect(wellsService.getWells()).rejects.toThrow(
        /Network error|Failed to fetch wells/
      );
    });
  });

  describe('getWellById', () => {
    it('should fetch a single well by ID', async () => {
      mockAxios
        .onGet(`${API_BASE_URL}/api/v1/wells/${mockWell.id}/`)
        .reply(200, mockWell);

      const result = await wellsService.getWellById(mockWell.id);

      expect(result).toEqual(mockWell);
      expect(result.id).toBe(mockWell.id);
      expect(result.well_name).toBe('Test Well');
      expect(result.runs).toHaveLength(2);
      expect(result.runs_count).toBe(2);
    });

    it('should handle 404 error when well not found', async () => {
      const nonExistentId = 'non-existent-id';
      mockAxios
        .onGet(`${API_BASE_URL}/api/v1/wells/${nonExistentId}/`)
        .reply(404);

      await expect(wellsService.getWellById(nonExistentId)).rejects.toThrow(
        'Well not found'
      );
    });
  });

  describe('createWell', () => {
    it('should create a well successfully', async () => {
      const createdWell = { ...mockWell, ...mockCreateInput };
      mockAxios
        .onPost(`${API_BASE_URL}/api/v1/wells/`, mockCreateInput)
        .reply(201, createdWell);

      const result = await wellsService.createWell(mockCreateInput);

      expect(result).toEqual(createdWell);
      expect(result.well_name).toBe('New Well');
      expect(result.well_type).toBe('Gas');
    });

    it('should handle 400 validation error on create', async () => {
      mockAxios
        .onPost(`${API_BASE_URL}/api/v1/wells/`)
        .reply(400, { well_name: ['This field is required.'] });

      await expect(wellsService.createWell(mockCreateInput)).rejects.toThrow(
        'Well name: This field is required.'
      );
    });

    it('should handle 409 duplicate well name error', async () => {
      mockAxios
        .onPost(`${API_BASE_URL}/api/v1/wells/`)
        .reply(409, { detail: 'A well with this name already exists.' });

      await expect(wellsService.createWell(mockCreateInput)).rejects.toThrow(
        'A well with this name already exists'
      );
    });

    it('should handle 403 permission error', async () => {
      mockAxios
        .onPost(`${API_BASE_URL}/api/v1/wells/`)
        .reply(403);

      await expect(wellsService.createWell(mockCreateInput)).rejects.toThrow(
        'You do not have permission to perform this action'
      );
    });
  });

  describe('updateWell', () => {
    it('should update a well successfully', async () => {
      const updatedWell = { ...mockWell, well_name: 'Updated Well' };
      mockAxios
        .onPut(`${API_BASE_URL}/api/v1/wells/${mockWell.id}/`)
        .reply(200, updatedWell);

      const result = await wellsService.updateWell(mockWell.id, {
        well_name: 'Updated Well',
        well_type: 'Oil',
      });

      expect(result).toEqual(updatedWell);
      expect(result.well_name).toBe('Updated Well');
    });

    it('should handle 400 validation error on update', async () => {
      mockAxios
        .onPut(`${API_BASE_URL}/api/v1/wells/${mockWell.id}/`)
        .reply(400, { well_type: ['Invalid well type.'] });

      await expect(
        wellsService.updateWell(mockWell.id, mockCreateInput)
      ).rejects.toThrow('Well type: Invalid well type.');
    });

    it('should handle 404 error when updating non-existent well', async () => {
      const nonExistentId = 'non-existent-id';
      mockAxios
        .onPut(`${API_BASE_URL}/api/v1/wells/${nonExistentId}/`)
        .reply(404);

      await expect(
        wellsService.updateWell(nonExistentId, mockCreateInput)
      ).rejects.toThrow('Well not found');
    });
  });

  describe('deleteWell', () => {
    it('should delete a well successfully', async () => {
      mockAxios
        .onDelete(`${API_BASE_URL}/api/v1/wells/${mockWell.id}/`)
        .reply(204);

      await expect(wellsService.deleteWell(mockWell.id)).resolves.toBeUndefined();
    });

    it('should handle 404 error when deleting non-existent well', async () => {
      const nonExistentId = 'non-existent-id';
      mockAxios
        .onDelete(`${API_BASE_URL}/api/v1/wells/${nonExistentId}/`)
        .reply(404);

      await expect(wellsService.deleteWell(nonExistentId)).rejects.toThrow(
        'Well not found'
      );
    });

    it('should handle 403 permission error on delete', async () => {
      mockAxios
        .onDelete(`${API_BASE_URL}/api/v1/wells/${mockWell.id}/`)
        .reply(403);

      await expect(wellsService.deleteWell(mockWell.id)).rejects.toThrow(
        'You do not have permission to perform this action'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized error', async () => {
      mockAxios.onGet(/\/api\/v1\/wells\/.*/).reply(401);

      await expect(wellsService.getWells()).rejects.toThrow(
        'Authentication required. Please log in again'
      );
    });

    it('should handle 500 server error', async () => {
      mockAxios.onGet(/\/api\/v1\/wells\/.*/).reply(500);

      await expect(wellsService.getWells()).rejects.toThrow(
        'Server error. Please try again later'
      );
    });

    it('should handle 503 service unavailable', async () => {
      mockAxios.onGet(/\/api\/v1\/wells\/.*/).reply(503);

      await expect(wellsService.getWells()).rejects.toThrow(
        'Server error. Please try again later'
      );
    });
  });

  describe('JWT Token Handling', () => {
    // Note: These tests are skipped because interceptors are disabled in test environment
    // to allow MockAdapter to work properly. JWT token handling is tested in integration tests.

    it.skip('should attach JWT token to request headers', async () => {
      // Skipped: Interceptors disabled in test mode
    });

    it.skip('should refresh token on 401 and retry request', async () => {
      // Skipped: Interceptors disabled in test mode
    });
  });
});
