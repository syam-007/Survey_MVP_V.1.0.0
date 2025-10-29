/**
 * QA Service for GTL survey quality assurance operations
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface QAStation {
  index: number;
  md: number;
  inc: number;
  azi: number;
  g_t: number;
  w_t: number;
  g_t_difference: number;
  w_t_difference: number;
  g_t_status: 'high' | 'good' | 'low' | 'n/c';
  w_t_status: 'high' | 'good' | 'low' | 'n/c';
  overall_status: 'PASS' | 'REMOVE';
}

export interface QASummary {
  total_stations: number;
  pass_count: number;
  remove_count: number;
  g_t_score: string;
  w_t_score: string;
  g_t_percentage: number;
  w_t_percentage: number;
  location_g_t: number;
  location_w_t: number;
}

export interface QAResult {
  temp_qa_id?: string;  // Temporary QA ID (before approval)
  qa_id?: string;       // Permanent QA ID (after approval)
  run_id: string;
  file_name: string;
  summary: QASummary;
  stations: QAStation[];
  message: string;
}

export interface SaveQARequest {
  indices_to_keep?: number[];
}

class QAService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add auth token interceptor
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * Upload GTL survey file for QA review
   */
  async uploadGTLForQA(file: File, runId: string, surveyType: string): Promise<QAResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('run_id', runId);
    formData.append('survey_type', surveyType);

    const response = await this.api.post<QAResult>('/api/v1/surveys/gtl/qa/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Save QA-approved survey data to database
   */
  async saveQAApproved(qaId: string, indicesToKeep?: number[]): Promise<any> {
    const response = await this.api.post(`/api/v1/surveys/gtl/qa/${qaId}/save/`, {
      indices_to_keep: indicesToKeep,
    });

    return response.data;
  }

  /**
   * Delete/reject QA record
   */
  async deleteQARecord(qaId: string): Promise<void> {
    await this.api.delete(`/api/v1/surveys/gtl/qa/${qaId}/delete/`);
  }

  /**
   * Approve QA and trigger survey calculation
   */
  async approveQA(surveyDataId: string, indicesToKeep?: number[]): Promise<{ success: boolean; calculated_survey_id: string }> {
    const response = await this.api.post(`/api/v1/surveys/${surveyDataId}/qa/approve/`, {
      indices_to_keep: indicesToKeep,
    });
    return response.data;
  }

  /**
   * Approve temporary GTL QA and save to database with survey calculation
   */
  async approveTempQA(tempQaId: string, indicesToKeep?: number[]): Promise<{ success: boolean; survey_data_id: string; calculated_survey_id: string }> {
    const response = await this.api.post(`/api/v1/surveys/gtl/qa/temp/${tempQaId}/approve/`, {
      indices_to_keep: indicesToKeep,
    });
    return response.data;
  }
}

const qaServiceInstance = new QAService();

export default qaServiceInstance;
export { qaServiceInstance as qaService };
export type { QAStation, QASummary, QAResult, SaveQARequest };
