/**
 * LoadingPlot component - Shows loading state while plot data is being fetched.
 */
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export const LoadingPlot: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '400px',
        gap: 2,
        backgroundColor: '#fafafa',
        borderRadius: 1,
      }}
    >
      <CircularProgress size={60} />
      <Typography variant="body1" color="text.secondary">
        Loading plot data...
      </Typography>
    </Box>
  );
};
