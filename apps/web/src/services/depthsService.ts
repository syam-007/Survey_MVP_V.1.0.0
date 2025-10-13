import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Depth,
  CreateDepthInput,
  UpdateDepthInput,
} from '../types/depth.types';
import authService from './authService';

const API_BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_API_URL) || 'http://localhost:8000';

/**
 * Depths Service
 * Handles all API calls for Depth Information Management
 * Based on Story 3.2 (Depth Information API Data Models)
 */
class DepthsService {
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
   * Get depth by run ID
   * @param runId - Run UUID
   * @returns Depth details
   */
  async getDepthByRunId(runId: string): Promise<Depth> {
    try {
      const response = await this.api.get<Depth>(`/api/v1/depths/?run=${runId}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch depth');
    }
  }

  /**
   * Get depth by well ID
   * @param wellId - Well UUID
   * @returns Depth details
   */
  async getDepthByWellId(wellId: string): Promise<Depth> {
    try {
      const response = await this.api.get<Depth>(`/api/v1/depths/?well=${wellId}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch depth');
    }
  }

  /**
   * Get a single depth by ID
   * @param id - Depth UUID
   * @returns Depth details
   */
  async getDepthById(id: string): Promise<Depth> {
    try {
      const response = await this.api.get<Depth>(`/api/v1/depths/${id}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch depth details');
    }
  }

  /**
   * Create new depth information
   * @param data - Depth creation data
   * @returns Created depth
   */
  async createDepth(data: CreateDepthInput): Promise<Depth> {
    try {
      const response = await this.api.post<Depth>('/api/v1/depths/', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to create depth');
    }
  }

  /**
   * Update existing depth information
   * @param id - Depth UUID
   * @param data - Updated depth data
   * @returns Updated depth
   */
  async updateDepth(id: string, data: UpdateDepthInput): Promise<Depth> {
    try {
      const response = await this.api.patch<Depth>(`/api/v1/depths/${id}/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to update depth');
    }
  }

  /**
   * Delete depth information
   * @param id - Depth UUID
   */
  async deleteDepth(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/v1/depths/${id}/`);
    } catch (error: any) {
      throw this.handleError(error, 'Failed to delete depth');
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
          return new Error('Depth not found');

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

export default new DepthsService();
