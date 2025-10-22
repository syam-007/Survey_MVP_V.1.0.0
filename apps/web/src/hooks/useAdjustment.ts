/**
 * useAdjustment Hook
 *
 * React hook for managing curve adjustment operations.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import adjustmentService from '../services/adjustmentService';
import type { ApplyOffsetRequest, AdjustmentState } from '../types/adjustment.types';

/**
 * Hook to get current adjustment state
 */
export const useCurrentAdjustment = (comparisonId: string | undefined) => {
  return useQuery({
    queryKey: ['adjustment', comparisonId],
    queryFn: () => adjustmentService.getCurrentAdjustment(comparisonId!),
    enabled: !!comparisonId,
  });
};

/**
 * Hook to apply offset
 */
export const useApplyOffset = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      comparisonId,
      offsetData,
    }: {
      comparisonId: string;
      offsetData: ApplyOffsetRequest;
    }) => {
      return await adjustmentService.applyOffset(comparisonId, offsetData);
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch adjustment data
      queryClient.invalidateQueries({ queryKey: ['adjustment', variables.comparisonId] });
    },
  });

  return {
    applyOffset: mutation.mutateAsync,
    isApplying: mutation.isPending,
    error: mutation.error,
  };
};

/**
 * Hook to undo adjustment
 */
export const useUndoAdjustment = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (comparisonId: string) => {
      return await adjustmentService.undoAdjustment(comparisonId);
    },
    onSuccess: (data, comparisonId) => {
      queryClient.invalidateQueries({ queryKey: ['adjustment', comparisonId] });
    },
  });

  return {
    undoAdjustment: mutation.mutateAsync,
    isUndoing: mutation.isPending,
    error: mutation.error,
  };
};

/**
 * Hook to redo adjustment
 */
export const useRedoAdjustment = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (comparisonId: string) => {
      return await adjustmentService.redoAdjustment(comparisonId);
    },
    onSuccess: (data, comparisonId) => {
      queryClient.invalidateQueries({ queryKey: ['adjustment', comparisonId] });
    },
  });

  return {
    redoAdjustment: mutation.mutateAsync,
    isRedoing: mutation.isPending,
    error: mutation.error,
  };
};

/**
 * Hook to reset adjustments
 */
export const useResetAdjustments = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (comparisonId: string) => {
      return await adjustmentService.resetAdjustments(comparisonId);
    },
    onSuccess: (data, comparisonId) => {
      queryClient.invalidateQueries({ queryKey: ['adjustment', comparisonId] });
    },
  });

  return {
    resetAdjustments: mutation.mutateAsync,
    isResetting: mutation.isPending,
    error: mutation.error,
  };
};

/**
 * Hook to recalculate INC/AZI
 */
export const useRecalculateIncAzi = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (comparisonId: string) => {
      return await adjustmentService.recalculateIncAzi(comparisonId);
    },
    onSuccess: (data, comparisonId) => {
      queryClient.invalidateQueries({ queryKey: ['adjustment', comparisonId] });
    },
  });

  return {
    recalculateIncAzi: mutation.mutateAsync,
    isRecalculating: mutation.isPending,
    error: mutation.error,
  };
};
