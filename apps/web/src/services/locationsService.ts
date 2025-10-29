import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Location,
  CreateLocationInput,
  UpdateLocationInput,
} from '../types/location.types';
import authService from './authService';

const API_BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_API_URL) || 'http://localhost:8000';

/**
 * Locations Service
 * Handles all API calls for Location Information Management
 * Based on Story 3.1 (Location Information API Data Models)
 */
class LocationsService {
  private api: AxiosInstance;

  // Expose API instance for testing
  public getAxiosInstance(): AxiosInstance {
    return this.api;
  }

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Skip interceptors in test environment to allow MockAdapter to work
    const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

    if (!isTestEnv) {
      // Add request interceptor to include access token
      this.api.interceptors.request.use(
        (config) => {
          const token = authService.getAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        (error) => Promise.reject(error)
      );

      // Add response interceptor to handle errors
      this.api.interceptors.response.use(
        (response) => response,
        async (error) => {
          // If 401, try to refresh token (handled by authService)
          if (error.response?.status === 401) {
            const newAccessToken = await authService.refreshAccessToken();
            if (newAccessToken) {
              error.config.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.api(error.config);
            }
          }
          return Promise.reject(error);
        }
      );
    }
  }

  /**
   * Get location by run ID
   * @param runId - Run UUID
   * @returns Location details
   */
  async getLocationByRunId(runId: string): Promise<Location> {
    try {
      const response = await this.api.get<Location>(`/api/v1/locations/?run=${runId}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch location');
    }
  }

  /**
   * Get locations by well ID
   * @param wellId - Well UUID
   * @returns Array of locations
   */
  async getLocationsByWellId(wellId: string): Promise<Location[]> {
    try {
      const response = await this.api.get<{ results: Location[] }>(`/api/v1/locations/?well=${wellId}`);
      return response.data.results || [];
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch locations');
    }
  }

  /**
   * Get a single location by ID
   * @param id - Location UUID
   * @returns Location details
   */
  async getLocationById(id: string): Promise<Location> {
    try {
      const response = await this.api.get<Location>(`/api/v1/locations/${id}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch location details');
    }
  }

  /**
   * Create a new location
   * @param data - Location creation data
   * @returns Created location with calculated fields
   */
  async createLocation(data: CreateLocationInput): Promise<Location> {
    try {
      const response = await this.api.post<Location>('/api/v1/locations/', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to create location');
    }
  }

  /**
   * Update an existing location
   * @param id - Location UUID
   * @param data - Updated location data
   * @returns Updated location with recalculated fields
   */
  async updateLocation(id: string, data: UpdateLocationInput): Promise<Location> {
    try {
      const response = await this.api.patch<Location>(`/api/v1/locations/${id}/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to update location');
    }
  }

  /**
   * Delete a location
   * @param id - Location UUID
   */
  async deleteLocation(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/v1/locations/${id}/`);
    } catch (error: any) {
      throw this.handleError(error, 'Failed to delete location');
    }
  }

  /**
   * Handle API errors and return user-friendly error messages
   */
  private handleError(error: any, defaultMessage: string): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          // Validation errors
          if (data.errors) {
            const errorMessages = Object.entries(data.errors)
              .map(([field, messages]: [string, any]) => {
                const msgArray = Array.isArray(messages) ? messages : [messages];
                return `${field}: ${msgArray.join(', ')}`;
              })
              .join('; ');
            return new Error(errorMessages);
          }
          return new Error(data.message || 'Invalid request data');

        case 401:
          return new Error('You must be logged in to perform this action');

        case 403:
          return new Error('You do not have permission to perform this action');

        case 404:
          return new Error('Location not found');

        case 500:
          return new Error('Server error. Please try again later');

        default:
          return new Error(data.message || defaultMessage);
      }
    } else if (error.request) {
      // Network error
      return new Error('Cannot connect to server. Please check your connection');
    } else {
      // Other errors
      return new Error(error.message || defaultMessage);
    }
  }
}

export default new LocationsService();
