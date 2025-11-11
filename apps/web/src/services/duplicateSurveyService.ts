import axios from 'axios';
import type { AxiosInstance } from 'axios';
import authService from './authService';
import config from '../config/env';

const API_BASE_URL = config.apiBaseUrl;

export interface DuplicateSurveyData {
  survey_data_id: string;
  survey_file_name: string;
  interpolation_step: number;

  // Original data
  original_md: number[];
  original_inc: number[];
  original_azi: number[];

  // Forward results (interpolated)
  forward_md: number[];
  forward_inc: number[];
  forward_azi: number[];
  forward_north: number[];
  forward_east: number[];
  forward_tvd: number[];

  // Inverse results
  inverse_inc: number[];
  inverse_azi: number[];
  inverse_north: number[];
  inverse_east: number[];
  inverse_tvd: number[];

  // Comparison deltas
  delta_inc: number[];
  delta_azi: number[];
  delta_north: number[];
  delta_east: number[];
  delta_tvd: number[];

  // Limit values
  limit_north: number[];
  limit_east: number[];
  limit_tvd: number[];

  // Statistics
  point_count: number;
  max_delta_inc: number;
  max_delta_azi: number;
  max_delta_north: number;
  max_delta_east: number;
  max_delta_tvd: number;

  // Processing time
  forward_calculation_time: number;
  inverse_calculation_time: number;
  total_calculation_time: number;
}

export interface CalculateDuplicateSurveyRequest {
  survey_data_id: string;
  interpolation_step?: number;
}

/**
 * Duplicate Survey Service
 * Handles all API calls for Duplicate Survey calculations
 */
class DuplicateSurveyService {
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

  /**
   * Calculate duplicate survey (forward, inverse, comparison)
   * @param request - Duplicate survey calculation parameters
   * @returns Calculated duplicate survey data (not saved)
   */
  async calculateDuplicateSurvey(request: CalculateDuplicateSurveyRequest): Promise<DuplicateSurveyData> {
    const response = await this.api.post<DuplicateSurveyData>('/api/v1/duplicate-surveys/calculate/', request);
    return response.data;
  }

  /**
   * Export duplicate survey results to Excel
   * @param request - Duplicate survey calculation parameters
   * @returns Blob for Excel file download
   */
  async exportDuplicateSurvey(request: CalculateDuplicateSurveyRequest): Promise<Blob> {
    const response = await this.api.post('/api/v1/duplicate-surveys/export/', request, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Helper to download Excel file
   * @param request - Duplicate survey calculation parameters
   * @param filename - Optional custom filename
   */
  async downloadExcel(request: CalculateDuplicateSurveyRequest, filename?: string): Promise<void> {
    const blob = await this.exportDuplicateSurvey(request);

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `duplicate_survey_${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

const duplicateSurveyService = new DuplicateSurveyService();
export default duplicateSurveyService;
