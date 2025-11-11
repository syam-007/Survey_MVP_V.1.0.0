import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  TieOn,
  CreateTieOnInput,
  UpdateTieOnInput,
} from '../types/tieon.types';
import authService from './authService';
import config from '../config/env';

const API_BASE_URL = config.apiBaseUrl;

/**
 * TieOns Service
 * Handles all API calls for TieOn Information Management
 * Based on Story 3.4 (TieOn Information API Data Models)
 */
class TieOnsService {
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
   * Get tie-on by run ID
   * @param runId - Run UUID
   * @returns TieOn details
   */
  async getTieOnByRunId(runId: string): Promise<TieOn> {
    try {
      const response = await this.api.get<TieOn>(`/api/v1/tieons/?run=${runId}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch tie-on');
    }
  }

  /**
   * Get a single tie-on by ID
   * @param id - TieOn UUID
   * @returns TieOn details
   */
  async getTieOnById(id: string): Promise<TieOn> {
    try {
      const response = await this.api.get<TieOn>(`/api/v1/tieons/${id}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch tie-on details');
    }
  }

  /**
   * Create a new tie-on
   * @param data - TieOn creation data
   * @returns Created tie-on with calculated survey_interval_length
   */
  async createTieOn(data: CreateTieOnInput): Promise<TieOn> {
    try {
      const response = await this.api.post<TieOn>('/api/v1/tieons/', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to create tie-on');
    }
  }

  /**
   * Update an existing tie-on
   * @param id - TieOn UUID
   * @param data - Updated tie-on data
   * @returns Updated tie-on with recalculated survey_interval_length
   */
  async updateTieOn(id: string, data: UpdateTieOnInput): Promise<TieOn> {
    try {
      const response = await this.api.patch<TieOn>(`/api/v1/tieons/${id}/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to update tie-on');
    }
  }

  /**
   * Delete a tie-on
   * @param id - TieOn UUID
   */
  async deleteTieOn(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/v1/tieons/${id}/`);
    } catch (error: any) {
      throw this.handleError(error, 'Failed to delete tie-on');
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
          return new Error('Tie-on not found');

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

export default new TieOnsService();
