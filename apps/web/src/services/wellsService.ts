import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Well,
  CreateWellInput,
  WellFilters,
  PaginatedWellResponse,
} from '../types/well.types';
import authService from './authService';

const API_BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_API_URL) || 'http://localhost:8000';

/**
 * Wells Service
 * Handles all API calls for Well Management
 * Based on Story 2.2 (Well Management API)
 */
class WellsService {
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
          // If 401, try to refresh token
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
   * Get paginated list of wells with optional filters
   * @param filters - Filter options (well_type, search, ordering, pagination)
   * @returns Paginated well response
   */
  async getWells(filters?: WellFilters): Promise<PaginatedWellResponse> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        if (filters.well_type) params.append('well_type', filters.well_type);
        if (filters.search) params.append('search', filters.search);
        if (filters.ordering) params.append('ordering', filters.ordering);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());
      }

      const response = await this.api.get<PaginatedWellResponse>(
        `/api/v1/wells/?${params.toString()}`
      );

      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch wells');
    }
  }

  /**
   * Get a single well by ID with associated runs
   * @param id - Well UUID
   * @returns Well details with nested runs
   */
  async getWellById(id: string): Promise<Well> {
    try {
      const response = await this.api.get<Well>(`/api/v1/wells/${id}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch well details');
    }
  }

  /**
   * Create a new well
   * @param data - Well creation data
   * @returns Created well
   */
  async createWell(data: CreateWellInput): Promise<Well> {
    try {
      const response = await this.api.post<Well>('/api/v1/wells/', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to create well');
    }
  }

  /**
   * Create a new well with location in a single atomic transaction
   * @param wellData - Well creation data
   * @param locationData - Location creation data
   * @returns Created well with location
   */
  async createWellWithLocation(wellData: CreateWellInput, locationData: any): Promise<Well> {
    try {
      console.log('Creating well with location - Request payload:', {
        well_id: wellData.well_id,
        well_name: wellData.well_name,
        location: locationData,
      });

      const response = await this.api.post<Well>('/api/v1/wells/create_with_location/', {
        well_id: wellData.well_id,
        well_name: wellData.well_name,
        location: locationData,
      });
      return response.data;
    } catch (error: any) {
      console.error('createWellWithLocation error:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);

      // Preserve the original error for better debugging
      if (error.response) {
        const enrichedError: any = this.handleError(error, 'Failed to create well with location');
        enrichedError.response = error.response;
        throw enrichedError;
      }
      throw this.handleError(error, 'Failed to create well with location');
    }
  }

  /**
   * Update an existing well
   * @param id - Well UUID
   * @param data - Updated well data
   * @returns Updated well
   */
  async updateWell(id: string, data: CreateWellInput): Promise<Well> {
    try {
      const response = await this.api.put<Well>(`/api/v1/wells/${id}/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to update well');
    }
  }

  /**
   * Delete a well (hard delete with CASCADE)
   * @param id - Well UUID
   */
  async deleteWell(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/v1/wells/${id}/`);
    } catch (error: any) {
      throw this.handleError(error, 'Failed to delete well');
    }
  }

  /**
   * Handle API errors and provide user-friendly messages
   * @param error - Axios error
   * @param defaultMessage - Default error message
   * @returns Error with user-friendly message
   */
  private handleError(error: any, defaultMessage: string): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          // Validation error - return field-specific errors
          if (data.well_name) {
            return new Error(`Well name: ${data.well_name.join(', ')}`);
          }
          if (data.well_type) {
            return new Error(`Well type: ${data.well_type.join(', ')}`);
          }
          return new Error(data.detail || 'Invalid data provided');

        case 401:
          return new Error('Authentication required. Please log in again.');

        case 403:
          return new Error('You do not have permission to perform this action.');

        case 404:
          return new Error('Well not found.');

        case 409:
          return new Error('A well with this name already exists.');

        case 500:
        case 502:
        case 503:
          return new Error('Server error. Please try again later.');

        default:
          return new Error(data.detail || defaultMessage);
      }
    }

    // Network error or no response
    if (error.request) {
      return new Error('Network error. Please check your internet connection.');
    }

    return new Error(defaultMessage);
  }
}

export default new WellsService();
