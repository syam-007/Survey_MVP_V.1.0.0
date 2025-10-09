import React from 'react';
import { Alert, AlertTitle, Box } from '@mui/material';

interface ErrorAlertProps {
  error: Error | string;
  title?: string;
  onRetry?: () => void;
}

/**
 * ErrorAlert Component
 * Displays user-friendly error messages
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  title = 'Error',
  onRetry,
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <Box sx={{ my: 2 }}>
      <Alert severity="error">
        <AlertTitle>{title}</AlertTitle>
        {errorMessage}
        {onRetry && (
          <Box sx={{ mt: 1 }}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onRetry();
              }}
              style={{ textDecoration: 'underline', cursor: 'pointer' }}
            >
              Try again
            </a>
          </Box>
        )}
      </Alert>
    </Box>
  );
};
