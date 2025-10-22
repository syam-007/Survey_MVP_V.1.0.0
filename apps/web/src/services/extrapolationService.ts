import axios from 'axios';
import type { AxiosInstance } from 'axios';
import authService from './authService';

const API_BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_API_URL) || 'http://localhost:8000';

export interface ExtrapolationData {
  id: string;
  survey_data: string;
  run: string;
  created_by_username: string;
  survey_file_name: string;
  extrapolation_length: number;
  extrapolation_step: number;
  interpolation_step: number;
  extrapolation_method: string;
  // Original data
  original_md: number[];
  original_inc: number[];
  original_azi: number[];
  original_north: number[];
  original_east: number[];
  original_tvd: number[];
  // Interpolated data
  interpolated_md: number[];
  interpolated_inc: number[];
  interpolated_azi: number[];
  interpolated_north: number[];
  interpolated_east: number[];
  interpolated_tvd: number[];
  // Extrapolated data
  extrapolated_md: number[];
  extrapolated_inc: number[];
  extrapolated_azi: number[];
  extrapolated_north: number[];
  extrapolated_east: number[];
  extrapolated_tvd: number[];
  // Combined data
  combined_md: number[];
  combined_inc: number[];
  combined_azi: number[];
  combined_north: number[];
  combined_east: number[];
  combined_tvd: number[];
  // Statistics
  original_point_count: number;
  interpolated_point_count: number;
  extrapolated_point_count: number;
  final_md: number;
  final_tvd: number;
  final_horizontal_displacement: number;
  created_at: string;
  updated_at: string;
}

export interface CreateExtrapolationRequest {
  survey_data_id: string;
  run_id: string;
  extrapolation_length: number;
  extrapolation_step: number;
  interpolation_step: number;
  extrapolation_method: 'Constant' | 'Linear Trend' | 'Curve Fit';
}

/**
 * Extrapolation Service
 * Handles all API calls for Survey Extrapolation
 */
class ExtrapolationService {
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
   * Calculate extrapolation without saving to database
   * @param request - Extrapolation parameters
   * @returns Calculated extrapolation data (not saved)
   */
  async calculateExtrapolation(request: CreateExtrapolationRequest): Promise<Omit<ExtrapolationData, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'created_by_username' | 'survey_data' | 'run'>> {
    const response = await this.api.post('/api/v1/extrapolations/calculate/', request);
    return response.data;
  }

  /**
   * Save extrapolation to database
   * @param request - Extrapolation parameters
   * @returns Saved extrapolation data
   */
  async createExtrapolation(request: CreateExtrapolationRequest): Promise<ExtrapolationData> {
    const response = await this.api.post<ExtrapolationData>('/api/v1/extrapolations/', request);
    return response.data;
  }

  /**
   * Get extrapolation by ID
   * @param extrapolationId - Extrapolation UUID
   * @returns Extrapolation data
   */
  async getExtrapolation(extrapolationId: string): Promise<ExtrapolationData> {
    const response = await this.api.get<ExtrapolationData>(`/api/v1/extrapolations/${extrapolationId}/`);
    return response.data;
  }

  /**
   * List all extrapolations for a run
   * @param runId - Run UUID
   * @returns List of extrapolations
   */
  async listExtrapolationsByRun(runId: string): Promise<ExtrapolationData[]> {
    const response = await this.api.get<ExtrapolationData[]>(`/api/v1/extrapolations/by-run/${runId}/`);
    return response.data;
  }

  /**
   * Delete an extrapolation
   * @param extrapolationId - Extrapolation UUID
   */
  async deleteExtrapolation(extrapolationId: string): Promise<void> {
    await this.api.delete(`/api/v1/extrapolations/${extrapolationId}/`);
  }
}

const extrapolationService = new ExtrapolationService();
export default extrapolationService;
