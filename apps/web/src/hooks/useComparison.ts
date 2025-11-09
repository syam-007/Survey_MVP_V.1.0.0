/**
 * useComparison Hooks
 *
 * React Query hooks for survey comparison functionality.
 * Includes comparison creation, retrieval, listing, and deletion.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import comparisonsService from '../services/comparisonsService';
import type {
  ComparisonResult,
  ComparisonListItem,
  CreateComparisonRequest,
  ComparisonListResponse,
  ReferenceSurvey,
  ReferenceListResponse,
} from '../types/comparison.types';

// ============ Reference Survey Hooks ============

/**
 * Hook to upload a reference survey file
 */
export const useUploadReferenceSurvey = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      file,
      runId,
      surveyType,
      primarySurveyId,
    }: {
      file: File;
      runId: string;
      surveyType: string;
      primarySurveyId?: string;
    }) => {
      return await comparisonsService.uploadReferenceSurvey(file, runId, surveyType, primarySurveyId);
    },

    onSuccess: (data, variables) => {
      // Invalidate reference surveys list for the run
      queryClient.invalidateQueries({ queryKey: ['referenceSurveys', variables.runId] });
      queryClient.invalidateQueries({ queryKey: ['run', variables.runId] });
    },

    retry: (failureCount, error: any) => {
      // Don't retry validation errors
      if (error.message?.includes('validation') || error.message?.includes('Invalid')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  return {
    uploadReference: mutation.mutateAsync,
    isUploading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
};

/**
 * Hook to fetch list of reference surveys for a run
 */
export const useReferenceSurveys = (
  runId: string,
  primarySurveyId?: string,
  processingStatus?: string
) => {
  return useQuery<ReferenceListResponse, Error>({
    queryKey: ['referenceSurveys', runId, primarySurveyId, processingStatus],
    queryFn: () => comparisonsService.listReferenceSurveys(runId, primarySurveyId, processingStatus),
    enabled: !!runId,
  });
};

/**
 * Hook to fetch reference survey details
 */
export const useReferenceSurveyDetail = (id: string) => {
  return useQuery<ReferenceSurvey, Error>({
    queryKey: ['referenceSurvey', id],
    queryFn: () => comparisonsService.getReferenceSurveyDetail(id),
    enabled: !!id,
  });
};

// ============ Comparison Hooks ============

/**
 * Hook to calculate comparison without saving to database
 */
export const useCalculateComparison = () => {
  const mutation = useMutation({
    mutationFn: async ({
      primarySurveyId,
      referenceSurveyId,
      resolution,
    }: {
      primarySurveyId: string;
      referenceSurveyId: string;
      resolution: number;
    }) => {
      return await comparisonsService.calculateComparison(primarySurveyId, referenceSurveyId, resolution);
    },

    retry: (failureCount, error: any) => {
      // Don't retry validation errors
      if (error.message?.includes('validation') || error.message?.includes('overlap')) {
        return false;
      }
      return failureCount < 1;
    },
  });

  return {
    calculateComparison: mutation.mutateAsync,
    isCalculating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
};

/**
 * Hook to create a new comparison
 */
export const useCreateComparison = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: CreateComparisonRequest) => {
      return await comparisonsService.createComparison(data);
    },

    onSuccess: (data, variables) => {
      // Invalidate comparison list for the run
      queryClient.invalidateQueries({ queryKey: ['comparisons', variables.run_id] });
    },

    retry: (failureCount, error: any) => {
      // Don't retry validation errors
      if (error.message?.includes('validation') || error.message?.includes('overlap')) {
        return false;
      }
      return failureCount < 1;
    },
  });

  return {
    createComparison: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
};

/**
 * Hook to fetch comparison details
 */
export const useComparison = (comparisonId: string) => {
  return useQuery<ComparisonResult, Error>({
    queryKey: ['comparison', comparisonId],
    queryFn: () => comparisonsService.getComparisonDetail(comparisonId),
    enabled: !!comparisonId,
    staleTime: 5 * 60 * 1000, // 5 minutes - comparison data doesn't change
  });
};

/**
 * Hook to fetch list of comparisons for a run
 */
export const useComparisonHistory = (
  runId: string,
  page: number = 1,
  pageSize: number = 10,
  primarySurveyId?: string,
  referenceSurveyId?: string
) => {
  return useQuery<ComparisonListResponse, Error>({
    queryKey: ['comparisons', runId, page, pageSize, primarySurveyId, referenceSurveyId],
    queryFn: () =>
      comparisonsService.listComparisons(runId, page, pageSize, primarySurveyId, referenceSurveyId),
    enabled: !!runId,
    keepPreviousData: true, // Keep previous page data while fetching new page
  });
};

/**
 * Hook to delete a comparison
 */
export const useDeleteComparison = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (comparisonId: string) => {
      await comparisonsService.deleteComparison(comparisonId);
      return comparisonId;
    },

    onSuccess: (comparisonId, variables) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['comparison', comparisonId] });
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: ['comparisons'] });
    },
  });

  return {
    deleteComparison: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
};

/**
 * Hook to export/download comparison results
 */
export const useExportComparison = () => {
  const mutation = useMutation({
    mutationFn: async ({
      comparisonId,
      format,
      filename,
    }: {
      comparisonId: string;
      format: 'excel' | 'csv';
      filename?: string;
    }) => {
      await comparisonsService.downloadComparison(comparisonId, format, filename);
    },

    retry: false, // Don't retry downloads
  });

  return {
    exportComparison: mutation.mutateAsync,
    isExporting: mutation.isPending,
    error: mutation.error,
  };
};
