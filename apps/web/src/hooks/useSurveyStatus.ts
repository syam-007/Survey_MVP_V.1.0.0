/**
 * useSurveyStatus Hook
 *
 * React Query hook for polling survey processing status.
 * Automatically polls every 2 seconds until complete or error.
 * Provides automatic caching and background refetching.
 */
import { useQuery } from '@tanstack/react-query';
import surveysService from '../services/surveysService';

interface SurveyStatus {
  status: 'uploading' | 'validating' | 'calculating' | 'interpolating' | 'complete' | 'error';
  error?: string;
}

interface UseSurveyStatusResult {
  status: string;
  isLoading: boolean;
  error: string | null;
}

export const useSurveyStatus = (surveyDataId: string): UseSurveyStatusResult => {
  const { data, isLoading, error } = useQuery<SurveyStatus, Error>({
    queryKey: ['surveyStatus', surveyDataId],

    queryFn: async () => {
      const result = await surveysService.getSurveyStatus(surveyDataId);
      return {
        status: result.status || 'uploading',
        error: result.error || undefined
      };
    },

    // Polling configuration
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling when complete or error
      if (data?.status === 'complete' || data?.status === 'error') {
        return false;
      }
      // Poll every 2 seconds while processing
      return 2000;
    },

    // Enable query only when surveyDataId is provided
    enabled: !!surveyDataId,

    // Retry configuration
    retry: (failureCount, error) => {
      // Don't retry if we get a 404 (survey not found)
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return false;
      }
      // Retry network errors up to 3 times
      return failureCount < 3;
    },

    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Keep previous data while fetching new data
    placeholderData: (previousData) => previousData,

    // Stale time (data considered fresh for 1 second)
    staleTime: 1000
  });

  return {
    status: data?.status || 'uploading',
    isLoading,
    error: data?.error || error?.message || null
  };
};
