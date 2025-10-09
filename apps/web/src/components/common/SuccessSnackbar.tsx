import React from 'react';
import { Snackbar, Alert } from '@mui/material';

interface SuccessSnackbarProps {
  open: boolean;
  message: string;
  onClose: () => void;
  autoHideDuration?: number;
}

/**
 * SuccessSnackbar Component
 * Displays success notifications
 */
export const SuccessSnackbar: React.FC<SuccessSnackbarProps> = ({
  open,
  message,
  onClose,
  autoHideDuration = 6000,
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={onClose} severity="success" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};
