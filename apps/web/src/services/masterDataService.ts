/**
 * Master Data Service
 * Handles API calls for HoleSectionMaster, SurveyRunInMaster, and MinimumIdMaster
 */

import axios from 'axios';
import type { HoleSectionMaster, SurveyRunInMaster, MinimumIdMaster } from '../types';
import config from '../config/env';

const API_BASE_URL = `${config.apiBaseUrl}/api/v1`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

/**
 * Fetch all hole sections (optionally filtered by section_type)
 */
export const fetchHoleSections = async (sectionType?: string): Promise<HoleSectionMaster[]> => {
  const params = sectionType ? { section_type: sectionType } : {};
  const response = await axios.get(`${API_BASE_URL}/hole-sections/`, {
    ...getAuthHeaders(),
    params,
  });
  return response.data.results || response.data;
};

/**
 * Fetch survey run-ins (optionally filtered by run_in_type and max_size)
 */
export const fetchSurveyRunIns = async (
  runInType?: string,
  maxSize?: number
): Promise<SurveyRunInMaster[]> => {
  const params: any = {};
  if (runInType) params.run_in_type = runInType;
  if (maxSize !== undefined) params.max_size = maxSize;

  const response = await axios.get(`${API_BASE_URL}/survey-run-ins/`, {
    ...getAuthHeaders(),
    params,
  });
  return response.data.results || response.data;
};

/**
 * Fetch minimum IDs (optionally filtered by survey_run_in_id)
 */
export const fetchMinimumIds = async (surveyRunInId?: number): Promise<MinimumIdMaster[]> => {
  const params = surveyRunInId ? { survey_run_in_id: surveyRunInId } : {};
  const response = await axios.get(`${API_BASE_URL}/minimum-ids/`, {
    ...getAuthHeaders(),
    params,
  });
  return response.data.results || response.data;
};
