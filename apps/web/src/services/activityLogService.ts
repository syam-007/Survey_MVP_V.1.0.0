import axios from 'axios';
import type { AxiosInstance } from 'axios';
import authService from './authService';

const API_BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_API_URL) || 'http://localhost:8000';

export interface ActivityLog {
  id: string;
  run: string;
  user: string | null;
  user_name: string;
  user_email: string | null;
  activity_type: string;
  activity_type_display: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ActivityLogsResponse {
  count: number;
  results: ActivityLog[];
  page: number;
  page_size: number;
}

/**
 * Activity Log Service
 * Handles all API calls for activity logs (audit trail)
 */
class ActivityLogService {
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
   * Get activity logs for a specific run
   * @param runId - Run UUID
   * @param page - Page number (default: 1)
   * @param pageSize - Number of logs per page (default: 20)
   * @returns Activity logs response with pagination
   */
  async getActivityLogsByRun(runId: string, page: number = 1, pageSize: number = 20): Promise<ActivityLogsResponse> {
    const response = await this.api.get<ActivityLogsResponse>(
      `/api/v1/activity-logs/by-run/${runId}/`,
      {
        params: { page, page_size: pageSize },
      }
    );
    return response.data;
  }

  /**
   * Get all activity logs (with optional filtering)
   * @param params - Query parameters for filtering
   * @returns List of activity logs
   */
  async getAllActivityLogs(params?: Record<string, any>): Promise<ActivityLog[]> {
    const response = await this.api.get<ActivityLog[]>('/api/v1/activity-logs/', { params });
    return response.data;
  }

  /**
   * Get a single activity log by ID
   * @param logId - Activity log UUID
   * @returns Activity log details
   */
  async getActivityLog(logId: string): Promise<ActivityLog> {
    const response = await this.api.get<ActivityLog>(`/api/v1/activity-logs/${logId}/`);
    return response.data;
  }

  /**
   * Delete all activity logs for a specific run
   * @param runId - Run UUID
   * @returns Deletion result with count
   */
  async deleteAllByRun(runId: string): Promise<{ message: string; count: number }> {
    const response = await this.api.delete<{ message: string; count: number }>(
      `/api/v1/activity-logs/by-run/${runId}/delete-all/`
    );
    return response.data;
  }
}

const activityLogService = new ActivityLogService();
export default activityLogService;
