/**
 * Adjustment Service
 *
 * Handles all API calls for curve adjustment operations.
 * Supports offset application, undo/redo, reset, and recalculation.
 */
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  ApplyOffsetRequest,
  AdjustmentState,
} from '../types/adjustment.types';
import authService from './authService';

const API_BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_API_URL) || 'http://localhost:8000';

class AdjustmentService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Skip interceptors in test environment
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
          if (error.response?.status === 401) {
            // Token expired, try to refresh
            const refreshed = await authService.refreshToken();
            if (refreshed && error.config) {
              // Retry the original request with new token
              const token = authService.getAccessToken();
              error.config.headers.Authorization = `Bearer ${token}`;
              return this.api.request(error.config);
            }
          }
          return Promise.reject(error);
        }
      );
    }
  }

  /**
   * Get current adjustment state for a comparison
   */
  async getCurrentAdjustment(comparisonId: string): Promise<AdjustmentState> {
    try {
      const response = await this.api.get<AdjustmentState>(
        `/api/v1/comparisons/${comparisonId}/adjustment/current/`
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to get current adjustment');
    }
  }

  /**
   * Apply offset to comparative survey
   */
  async applyOffset(
    comparisonId: string,
    offsetData: ApplyOffsetRequest
  ): Promise<AdjustmentState> {
    try {
      const response = await this.api.post<AdjustmentState>(
        `/api/v1/comparisons/${comparisonId}/adjustment/apply/`,
        offsetData
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to apply offset');
    }
  }

  /**
   * Undo last adjustment
   */
  async undoAdjustment(comparisonId: string): Promise<AdjustmentState> {
    try {
      const response = await this.api.post<AdjustmentState>(
        `/api/v1/comparisons/${comparisonId}/adjustment/undo/`
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to undo adjustment');
    }
  }

  /**
   * Redo next adjustment
   */
  async redoAdjustment(comparisonId: string): Promise<AdjustmentState> {
    try {
      const response = await this.api.post<AdjustmentState>(
        `/api/v1/comparisons/${comparisonId}/adjustment/redo/`
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to redo adjustment');
    }
  }

  /**
   * Reset all adjustments to original
   */
  async resetAdjustments(comparisonId: string): Promise<AdjustmentState> {
    try {
      const response = await this.api.post<AdjustmentState>(
        `/api/v1/comparisons/${comparisonId}/adjustment/reset/`
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to reset adjustments');
    }
  }

  /**
   * Recalculate INC and AZI from adjusted path
   */
  async recalculateIncAzi(comparisonId: string): Promise<AdjustmentState> {
    try {
      const response = await this.api.post<AdjustmentState>(
        `/api/v1/comparisons/${comparisonId}/adjustment/recalculate/`
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to recalculate INC/AZI');
    }
  }

  /**
   * Handle API errors and return user-friendly error messages
   */
  private handleError(error: any, defaultMessage: string): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Handle specific error codes
      if (status === 400) {
        return new Error(data.message || data.error || 'Invalid request');
      } else if (status === 401) {
        return new Error('Unauthorized. Please log in again.');
      } else if (status === 403) {
        return new Error('You do not have permission to perform this action');
      } else if (status === 404) {
        return new Error('Comparison or adjustment not found');
      } else if (status === 500) {
        return new Error(data.message || 'Server error occurred');
      }

      // Return API error message if available
      return new Error(data.message || data.error || defaultMessage);
    } else if (error.request) {
      // Request made but no response received
      return new Error('No response from server. Please check your connection.');
    } else {
      // Something else happened
      return new Error(error.message || defaultMessage);
    }
  }
}

// Export singleton instance
const adjustmentService = new AdjustmentService();
export default adjustmentService;
