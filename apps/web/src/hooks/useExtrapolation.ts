/**
 * useExtrapolation Hooks
 *
 * React Query hooks for survey extrapolation functionality.
 * Includes extrapolation creation, retrieval, listing, and deletion.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import extrapolationService, { type ExtrapolationData, type CreateExtrapolationRequest } from '../services/extrapolationService';

/**
 * Hook to create a new extrapolation
 */
export const useCreateExtrapolation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: CreateExtrapolationRequest) => {
      return await extrapolationService.createExtrapolation(data);
    },

    onSuccess: (data, variables) => {
      // Invalidate extrapolation list for the run
      queryClient.invalidateQueries({ queryKey: ['extrapolations', variables.run_id] });
    },

    retry: (failureCount, error: any) => {
      // Don't retry validation errors
      if (error.message?.includes('validation') || error.message?.includes('Invalid')) {
        return false;
      }
      return failureCount < 1;
    },
  });

  return {
    createExtrapolation: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
};

/**
 * Hook to fetch extrapolation details
 */
export const useExtrapolation = (extrapolationId: string) => {
  return useQuery<ExtrapolationData, Error>({
    queryKey: ['extrapolation', extrapolationId],
    queryFn: () => extrapolationService.getExtrapolation(extrapolationId),
    enabled: !!extrapolationId,
    staleTime: 5 * 60 * 1000, // 5 minutes - extrapolation data doesn't change
  });
};

/**
 * Hook to fetch list of extrapolations for a run
 */
export const useExtrapolationsByRun = (
  runId: string,
  enabled: boolean = true
) => {
  return useQuery<ExtrapolationData[], Error>({
    queryKey: ['extrapolations', runId],
    queryFn: () => extrapolationService.listExtrapolationsByRun(runId),
    enabled: !!runId && enabled,
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};

/**
 * Hook to delete an extrapolation
 */
export const useDeleteExtrapolation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (extrapolationId: string) => {
      await extrapolationService.deleteExtrapolation(extrapolationId);
      return extrapolationId;
    },

    onSuccess: (extrapolationId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['extrapolation', extrapolationId] });
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: ['extrapolations'] });
    },
  });

  return {
    deleteExtrapolation: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
};
