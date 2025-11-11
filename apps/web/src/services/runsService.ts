import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Run,
  CreateRunInput,
  RunFilters,
  PaginatedRunResponse,
} from '../types/run.types';
import authService from './authService';
import config from '../config/env';

const API_BASE_URL = config.apiBaseUrl;

/**
 * Runs Service
 * Handles all API calls for Run Management
 * Based on Story 2.1 (Run Management API) and Story 2.3 (Filtering/Search/Pagination)
 */
class RunsService {
  private api: AxiosInstance;

  // Expose API instance for testing
  public getAxiosInstance(): AxiosInstance {
    return this.api;
  }

  constructor() {
    console.log(API_BASE_URL)
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
   * Get paginated list of runs with optional filters
   * @param filters - Filter options (run_type, well, dates, search, ordering, pagination)
   * @returns Paginated run response
   */
  async getRuns(filters?: RunFilters): Promise<PaginatedRunResponse> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        if (filters.run_type) params.append('run_type', filters.run_type);
        if (filters.well) params.append('well', filters.well);
        if (filters.created_at_after) params.append('created_at_after', filters.created_at_after);
        if (filters.created_at_before) params.append('created_at_before', filters.created_at_before);
        if (filters.updated_at_after) params.append('updated_at_after', filters.updated_at_after);
        if (filters.updated_at_before) params.append('updated_at_before', filters.updated_at_before);
        if (filters.search) params.append('search', filters.search);
        if (filters.ordering) params.append('ordering', filters.ordering);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());
      }

      const response = await this.api.get<PaginatedRunResponse>(
        `/api/v1/runs/?${params.toString()}`
      );
      console.log(response.data)

      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch runs');
    }
  }

  /**
   * Get a single run by ID
   * @param id - Run UUID
   * @returns Run details
   */
  async getRunById(id: string): Promise<Run> {
    try {
      const response = await this.api.get<Run>(`/api/v1/runs/${id}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch run details');
    }
  }

  /**
   * Create a new run
   * @param data - Run creation data
   * @returns Created run
   */
  async createRun(data: CreateRunInput): Promise<Run> {
    try {
      const response = await this.api.post<Run>('/api/v1/runs/', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to create run');
    }
  }

  /**
   * Update an existing run (full update)
   * @param id - Run UUID
   * @param data - Updated run data
   * @returns Updated run
   */
  async updateRun(id: string, data: CreateRunInput): Promise<Run> {
    try {
      const response = await this.api.put<Run>(`/api/v1/runs/${id}/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to update run');
    }
  }

  /**
   * Partially update a run
   * @param id - Run UUID
   * @param data - Partial run data
   * @returns Updated run
   */
  async patchRun(id: string, data: Partial<CreateRunInput>): Promise<Run> {
    try {
      const response = await this.api.patch<Run>(`/api/v1/runs/${id}/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to update run');
    }
  }

  /**
   * Soft delete a run
   * @param id - Run UUID
   */
  async deleteRun(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/v1/runs/${id}/`);
    } catch (error: any) {
      throw this.handleError(error, 'Failed to delete run');
    }
  }

  /**
   * Validate if run number or run name already exists
   * @param runNumber - Run number to check
   * @param runName - Run name to check
   * @param excludeId - Optional run ID to exclude from check (for updates)
   * @returns Object indicating if run_number or run_name exists
   */
  async validateUnique(
    runNumber?: string,
    runName?: string,
    excludeId?: string
  ): Promise<{ run_number_exists: boolean; run_name_exists: boolean }> {
    try {
      const params = new URLSearchParams();
      if (runNumber) params.append('run_number', runNumber);
      if (runName) params.append('run_name', runName);
      if (excludeId) params.append('exclude_id', excludeId);

      const response = await this.api.get<{ run_number_exists: boolean; run_name_exists: boolean }>(
        `/api/v1/runs/validate_unique/?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      // On error, assume doesn't exist to allow form submission attempt
      // Backend will properly validate on submission
      console.error('Validation check failed:', error);
      return { run_number_exists: false, run_name_exists: false };
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
          return new Error('Run not found');

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

export default new RunsService();
