/**
 * useSurveyUpload Hook
 *
 * React Query hook for uploading survey files with progress tracking.
 * Provides optimistic updates, automatic retry logic, and cache invalidation.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import surveysService from '../services/surveysService';

interface UploadParams {
  file: File;
  runId: string;
  surveyType: string;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  surveyDataId: string;
  message: string;
  filename: string;
}

interface UploadError {
  message: string;
  validationErrors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
}

export const useSurveyUpload = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<UploadResult, UploadError, UploadParams>({
    mutationFn: async ({ file, runId, surveyType, onProgress }) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('run_id', runId);
        formData.append('survey_type', surveyType);

        const result = await surveysService.uploadSurveyFile(formData, onProgress);

        return {
          surveyDataId: result.survey_data.id,
          message: result.message || 'Upload successful',
          filename: file.name
        };
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || err.message || 'Upload failed';
        const validationErrors = err.response?.data?.validation_errors;

        throw {
          message: errorMessage,
          validationErrors
        };
      }
    },

    // Retry configuration
    retry: (failureCount, error) => {
      // Don't retry validation errors or client errors (4xx)
      if (error.validationErrors || error.message?.includes('validation')) {
        return false;
      }
      // Retry network errors up to 2 times
      return failureCount < 2;
    },

    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Optimistic update
    onMutate: async ({ runId, file }) => {
      // Cancel any outgoing refetches for run details
      await queryClient.cancelQueries({ queryKey: ['run', runId] });

      // Snapshot previous value
      const previousRun = queryClient.getQueryData(['run', runId]);

      // Optimistically update with pending file
      queryClient.setQueryData(['run', runId], (old: any) => {
        if (!old) return old;

        const newFile = {
          id: 'temp-' + Date.now(),
          filename: file.name,
          survey_type: 'pending',
          processing_status: 'pending',
          upload_date: new Date().toISOString(),
          file_size: file.size
        };

        return {
          ...old,
          survey_files: [...(old.survey_files || []), newFile]
        };
      });

      return { previousRun };
    },

    // On error, rollback optimistic update
    onError: (err, variables, context) => {
      if (context?.previousRun) {
        queryClient.setQueryData(['run', variables.runId], context.previousRun);
      }
    },

    // On success, invalidate queries to refetch fresh data
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['run', variables.runId] });
      queryClient.invalidateQueries({ queryKey: ['surveyFiles', variables.runId] });
    }
  });

  return {
    uploadSurvey: mutation.mutateAsync,
    isUploading: mutation.isPending,
    error: mutation.error?.message || null,
    validationErrors: mutation.error?.validationErrors || null,
    reset: mutation.reset
  };
};
