import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import type { Location, CreateLocationInput } from '../../types/location.types';

// Mock authService
const mockGetAccessToken = jest.fn(() => 'mock-access-token');
const mockRefreshAccessToken = jest.fn();

jest.mock('../authService', () => ({
  default: {
    getAccessToken: mockGetAccessToken,
    refreshAccessToken: mockRefreshAccessToken,
  },
}));

import locationsService from '../locationsService';

describe('LocationsService', () => {
  let mockAxios: InstanceType<typeof MockAdapter>;
  const API_BASE_URL = 'http://localhost:8000';

  const mockLocation: Location = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    run: '223e4567-e89b-12d3-a456-426614174001',
    latitude: 29.760427,
    longitude: -95.369803,
    geodetic_system: 'WGS84',
    map_zone: 'UTM Zone 15N',
    north_reference: 'True North',
    central_meridian: -93.0,
    easting: 280000.5,
    northing: 3290000.75,
    grid_correction: 0.25,
    g_t: 1.5,
    w_t: 2.3,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
  };

  const mockCreateInput: CreateLocationInput = {
    run: '223e4567-e89b-12d3-a456-426614174001',
    latitude: 29.760427,
    longitude: -95.369803,
    geodetic_system: 'WGS84',
    map_zone: 'UTM Zone 15N',
    north_reference: 'True North',
    central_meridian: -93.0,
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(locationsService.getAxiosInstance());
  });

  afterEach(() => {
    mockAxios.reset();
    mockAxios.restore();
    jest.clearAllMocks();
  });

  describe('getLocationByRunId', () => {
    it('should fetch location by run ID', async () => {
      const runId = '223e4567-e89b-12d3-a456-426614174001';
      mockAxios
        .onGet(`${API_BASE_URL}/api/v1/locations/?run=${runId}`)
        .reply(200, mockLocation);

      const result = await locationsService.getLocationByRunId(runId);

      expect(result).toEqual(mockLocation);
      expect(result.run).toBe(runId);
    });

    it('should handle 404 error when location not found', async () => {
      const runId = 'non-existent-run';
      mockAxios
        .onGet(`${API_BASE_URL}/api/v1/locations/?run=${runId}`)
        .reply(404);

      await expect(locationsService.getLocationByRunId(runId)).rejects.toThrow(
        'Location not found'
      );
    });
  });

  describe('getLocationById', () => {
    it('should fetch a single location by ID', async () => {
      mockAxios
        .onGet(`${API_BASE_URL}/api/v1/locations/${mockLocation.id}/`)
        .reply(200, mockLocation);

      const result = await locationsService.getLocationById(mockLocation.id);

      expect(result).toEqual(mockLocation);
      expect(result.id).toBe(mockLocation.id);
    });

    it('should handle 404 error when location not found', async () => {
      const nonExistentId = 'non-existent-id';
      mockAxios
        .onGet(`${API_BASE_URL}/api/v1/locations/${nonExistentId}/`)
        .reply(404);

      await expect(locationsService.getLocationById(nonExistentId)).rejects.toThrow(
        'Location not found'
      );
    });
  });

  describe('createLocation', () => {
    it('should create a new location with calculated fields', async () => {
      mockAxios
        .onPost(`${API_BASE_URL}/api/v1/locations/`)
        .reply(201, mockLocation);

      const result = await locationsService.createLocation(mockCreateInput);

      expect(result).toEqual(mockLocation);
      expect(result.latitude).toBe(mockCreateInput.latitude);
      expect(result.longitude).toBe(mockCreateInput.longitude);
      // Verify calculated fields are returned
      expect(result.easting).toBeDefined();
      expect(result.northing).toBeDefined();
      expect(result.grid_correction).toBeDefined();
    });

    it('should handle validation errors', async () => {
      mockAxios.onPost(`${API_BASE_URL}/api/v1/locations/`).reply(400, {
        errors: {
          latitude: ['Latitude must be between -90 and 90'],
          longitude: ['Longitude must be between -180 and 180'],
        },
      });

      await expect(locationsService.createLocation(mockCreateInput)).rejects.toThrow(
        'latitude: Latitude must be between -90 and 90; longitude: Longitude must be between -180 and 180'
      );
    });

    it('should handle 401 unauthorized error', async () => {
      mockAxios.onPost(`${API_BASE_URL}/api/v1/locations/`).reply(401);

      await expect(locationsService.createLocation(mockCreateInput)).rejects.toThrow(
        'You must be logged in to perform this action'
      );
    });
  });

  describe('updateLocation', () => {
    it('should update an existing location', async () => {
      const updateData = { latitude: 30.0, longitude: -96.0 };
      const updatedLocation = { ...mockLocation, ...updateData };
      mockAxios
        .onPatch(`${API_BASE_URL}/api/v1/locations/${mockLocation.id}/`)
        .reply(200, updatedLocation);

      const result = await locationsService.updateLocation(mockLocation.id, updateData);

      expect(result).toEqual(updatedLocation);
      expect(result.latitude).toBe(30.0);
    });

    it('should handle 404 error when updating non-existent location', async () => {
      const nonExistentId = 'non-existent-id';
      mockAxios
        .onPatch(`${API_BASE_URL}/api/v1/locations/${nonExistentId}/`)
        .reply(404);

      await expect(
        locationsService.updateLocation(nonExistentId, { latitude: 30.0 })
      ).rejects.toThrow('Location not found');
    });
  });

  describe('deleteLocation', () => {
    it('should delete a location', async () => {
      mockAxios
        .onDelete(`${API_BASE_URL}/api/v1/locations/${mockLocation.id}/`)
        .reply(204);

      await expect(locationsService.deleteLocation(mockLocation.id)).resolves.not.toThrow();
    });

    it('should handle 404 error when deleting non-existent location', async () => {
      const nonExistentId = 'non-existent-id';
      mockAxios
        .onDelete(`${API_BASE_URL}/api/v1/locations/${nonExistentId}/`)
        .reply(404);

      await expect(locationsService.deleteLocation(nonExistentId)).rejects.toThrow(
        'Location not found'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle 500 server error', async () => {
      mockAxios
        .onGet(`${API_BASE_URL}/api/v1/locations/${mockLocation.id}/`)
        .reply(500);

      await expect(locationsService.getLocationById(mockLocation.id)).rejects.toThrow(
        'Server error. Please try again later'
      );
    });

    it('should handle network error', async () => {
      mockAxios
        .onGet(`${API_BASE_URL}/api/v1/locations/${mockLocation.id}/`)
        .networkError();

      await expect(locationsService.getLocationById(mockLocation.id)).rejects.toThrow(
        /Network Error/
      );
    });
  });
});
