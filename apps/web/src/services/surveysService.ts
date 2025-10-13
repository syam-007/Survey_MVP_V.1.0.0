import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Survey,
  CreateSurveyInput,
  UpdateSurveyInput,
} from '../types/survey.types';
import authService from './authService';

const API_BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_API_URL) || 'http://localhost:8000';

/**
 * Surveys Service
 * Handles all API calls for Survey Information Management
 * Based on Story 3.3 (Survey Information API Data Models)
 */
class SurveysService {
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
   * Get survey by run ID
   * @param runId - Run UUID
   * @returns Survey details
   */
  async getSurveyByRunId(runId: string): Promise<Survey> {
    try {
      const response = await this.api.get<Survey>(`/api/v1/surveys/?run=${runId}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch survey');
    }
  }

  /**
   * Get a single survey by ID
   * @param id - Survey UUID
   * @returns Survey details
   */
  async getSurveyById(id: string): Promise<Survey> {
    try {
      const response = await this.api.get<Survey>(`/api/v1/surveys/${id}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch survey details');
    }
  }

  /**
   * Create a new survey
   * @param data - Survey creation data
   * @returns Created survey
   */
  async createSurvey(data: CreateSurveyInput): Promise<Survey> {
    try {
      const response = await this.api.post<Survey>('/api/v1/surveys/', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to create survey');
    }
  }

  /**
   * Update an existing survey
   * @param id - Survey UUID
   * @param data - Updated survey data
   * @returns Updated survey
   */
  async updateSurvey(id: string, data: UpdateSurveyInput): Promise<Survey> {
    try {
      const response = await this.api.patch<Survey>(`/api/v1/surveys/${id}/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to update survey');
    }
  }

  /**
   * Delete a survey
   * @param id - Survey UUID
   */
  async deleteSurvey(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/v1/surveys/${id}/`);
    } catch (error: any) {
      throw this.handleError(error, 'Failed to delete survey');
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
          return new Error('Survey not found');

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

export default new SurveysService();
