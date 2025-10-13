/**
 * GridWrapper - Compatibility wrapper for MUI v7 Grid
 * Provides Grid-like behavior using Box/Stack for MUI v7 compatibility
 */
import React from 'react';
import { Box, Stack } from '@mui/material';

interface GridWrapperProps {
  container?: boolean;
  item?: boolean;
  xs?: number;
  sm?: number;
  spacing?: number;
  children: React.ReactNode;
}

export const GridWrapper: React.FC<GridWrapperProps> = ({
  container,
  item,
  xs,
  sm,
  spacing = 3,
  children,
}) => {
  // If container, render as Stack
  if (container) {
    return <Stack spacing={spacing}>{children}</Stack>;
  }

  // If item, determine flex behavior
  if (item) {
    // Full width on mobile (xs=12) or flexible on larger screens
    if (xs === 12 && !sm) {
      return <Box>{children}</Box>;
    }
    // Flex item for responsive layout
    return <Box sx={{ flex: sm === 6 ? 1 : 'auto' }}>{children}</Box>;
  }

  // Default: just a Box
  return <Box>{children}</Box>;
};
