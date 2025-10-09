import React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';

interface SkeletonLoaderProps {
  rows?: number;
  variant?: 'table' | 'card' | 'detail';
}

/**
 * SkeletonLoader Component
 * Displays skeleton placeholders while content is loading
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  rows = 5,
  variant = 'table',
}) => {
  if (variant === 'table') {
    return (
      <Stack spacing={1}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} variant="rectangular" height={60} />
        ))}
      </Stack>
    );
  }

  if (variant === 'card') {
    return (
      <Box>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="40%" height={24} />
      </Box>
    );
  }

  if (variant === 'detail') {
    return (
      <Stack spacing={2}>
        <Skeleton variant="text" width="80%" height={40} />
        <Skeleton variant="text" width="60%" height={28} />
        <Skeleton variant="text" width="70%" height={28} />
        <Skeleton variant="rectangular" height={120} sx={{ mt: 2 }} />
        <Skeleton variant="text" width="50%" height={28} />
      </Stack>
    );
  }

  return null;
};
