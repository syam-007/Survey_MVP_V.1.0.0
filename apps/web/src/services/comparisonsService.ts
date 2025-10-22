import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  ComparisonResult,
  ComparisonListItem,
  CreateComparisonRequest,
  ComparisonListResponse,
  ReferenceSurvey,
  ReferenceListResponse,
} from '../types/comparison.types';
import authService from './authService';

const API_BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_API_URL) || 'http://localhost:8000';

/**
 * Comparisons Service
 * Handles all API calls for Survey Comparison and Delta Analysis
 * Based on Stories 5.1-5.6 (Epic 5: Comparison & Delta Analysis)
 */
class ComparisonsService {
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

  // ============ Reference Survey APIs ============

  /**
   * Upload a reference survey file
   * @param file - Survey file to upload
   * @param runId - Run UUID
   * @param surveyType - Type of survey (GTL, Gyro, MWD)
   * @param primarySurveyId - Optional primary survey ID to link to
   * @returns Upload response with survey file and survey data IDs
   */
  async uploadReferenceSurvey(
    file: File,
    runId: string,
    surveyType: string,
    primarySurveyId?: string
  ): Promise<{
    message: string;
    survey_file_id: string;
    survey_data_id: string;
    processing_status: string;
    survey_role: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('run_id', runId);
      formData.append('survey_type', surveyType);
      if (primarySurveyId) {
        formData.append('primary_survey_id', primarySurveyId);
      }

      const response = await this.api.post('/api/v1/surveys/reference/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to upload reference survey');
    }
  }

  /**
   * Get list of reference surveys for a run
   * @param runId - Run UUID
   * @param primarySurveyId - Optional primary survey ID filter
   * @param processingStatus - Optional status filter
   * @returns List of reference surveys
   */
  async listReferenceSurveys(
    runId: string,
    primarySurveyId?: string,
    processingStatus?: string
  ): Promise<ReferenceListResponse> {
    try {
      const params = new URLSearchParams({ run_id: runId });
      if (primarySurveyId) params.append('primary_survey_id', primarySurveyId);
      if (processingStatus) params.append('processing_status', processingStatus);

      const response = await this.api.get<ReferenceListResponse>(
        `/api/v1/surveys/reference/?${params.toString()}`
      );

      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch reference surveys');
    }
  }

  /**
   * Get reference survey details
   * @param id - Reference survey UUID
   * @returns Reference survey details
   */
  async getReferenceSurveyDetail(id: string): Promise<ReferenceSurvey> {
    try {
      const response = await this.api.get<ReferenceSurvey>(`/api/v1/surveys/reference/${id}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch reference survey details');
    }
  }

  // ============ Comparison APIs ============

  /**
   * Create a new survey comparison
   * @param data - Comparison creation data
   * @returns Created comparison with full delta data
   */
  async createComparison(data: CreateComparisonRequest): Promise<ComparisonResult> {
    try {
      const response = await this.api.post<ComparisonResult>('/api/v1/comparisons/', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to create comparison');
    }
  }

  /**
   * Get comparison details by ID
   * @param comparisonId - Comparison UUID
   * @returns Comparison result with full delta data
   */
  async getComparisonDetail(comparisonId: string): Promise<ComparisonResult> {
    try {
      const response = await this.api.get<ComparisonResult>(`/api/v1/comparisons/${comparisonId}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch comparison details');
    }
  }

  /**
   * List comparisons for a run
   * @param runId - Run UUID
   * @param page - Page number
   * @param pageSize - Results per page
   * @param primarySurveyId - Optional primary survey filter
   * @param referenceSurveyId - Optional reference survey filter
   * @returns Paginated list of comparisons
   */
  async listComparisons(
    runId: string,
    page: number = 1,
    pageSize: number = 10,
    primarySurveyId?: string,
    referenceSurveyId?: string
  ): Promise<ComparisonListResponse> {
    try {
      const params = new URLSearchParams({
        run_id: runId,
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (primarySurveyId) params.append('primary_survey_id', primarySurveyId);
      if (referenceSurveyId) params.append('reference_survey_id', referenceSurveyId);

      const response = await this.api.get<ComparisonListResponse>(
        `/api/v1/comparisons/list/?${params.toString()}`
      );

      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch comparisons');
    }
  }

  /**
   * Delete a comparison
   * @param comparisonId - Comparison UUID
   */
  async deleteComparison(comparisonId: string): Promise<void> {
    try {
      await this.api.delete(`/api/v1/comparisons/${comparisonId}/delete/`);
    } catch (error: any) {
      throw this.handleError(error, 'Failed to delete comparison');
    }
  }

  /**
   * Export comparison results
   * @param comparisonId - Comparison UUID
   * @param format - Export format ('excel' or 'csv')
   * @returns Blob for file download
   */
  async exportComparison(comparisonId: string, format: 'excel' | 'csv' = 'excel'): Promise<Blob> {
    try {
      const response = await this.api.get(`/api/v1/comparisons/${comparisonId}/export/`, {
        params: { format },
        responseType: 'blob',
      });

      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to export comparison');
    }
  }

  /**
   * Download comparison file
   * Helper method to trigger browser download
   * @param comparisonId - Comparison UUID
   * @param format - Export format ('excel' or 'csv')
   * @param filename - Optional custom filename
   */
  async downloadComparison(
    comparisonId: string,
    format: 'excel' | 'csv' = 'excel',
    filename?: string
  ): Promise<void> {
    try {
      const blob = await this.exportComparison(comparisonId, format);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `comparison_${comparisonId}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      throw this.handleError(error, 'Failed to download comparison');
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
          if (data.error) return new Error(data.error);
          if (data.details) {
            const errorMessages = Object.entries(data.details)
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
          return new Error(data.error || 'You do not have permission to perform this action');

        case 404:
          return new Error(data.error || 'Resource not found');

        case 500:
          return new Error(data.error || 'Server error. Please try again later');

        default:
          return new Error(data.error || data.message || defaultMessage);
      }
    } else if (error.request) {
      return new Error('Cannot connect to server. Please check your connection');
    } else {
      return new Error(error.message || defaultMessage);
    }
  }
}

export default new ComparisonsService();
