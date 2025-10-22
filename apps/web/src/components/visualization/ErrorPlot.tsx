/**
 * ErrorPlot component - Shows error state when plot rendering fails.
 */
import React from 'react';
import { Alert, Button, Box } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface ErrorPlotProps {
  error: Error;
  onRetry?: () => void;
}

export const ErrorPlot: React.FC<ErrorPlotProps> = ({ error, onRetry }) => {
  return (
    <Box
      sx={{
        p: 4,
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fafafa',
        borderRadius: 1,
      }}
    >
      <Alert severity="error" sx={{ mb: 2, maxWidth: '600px' }}>
        <strong>Failed to render plot</strong>
        <p style={{ margin: '8px 0 0 0' }}>{error.message}</p>
      </Alert>
      {onRetry && (
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          sx={{ mt: 1 }}
        >
          Retry
        </Button>
      )}
    </Box>
  );
};
