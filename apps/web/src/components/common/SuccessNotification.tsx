/**
 * SuccessNotification Component
 *
 * Displays success notifications using Material-UI Snackbar.
 * Auto-dismisses after a configurable duration.
 */
import React from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  IconButton
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';

export interface SuccessNotificationProps {
  /**
   * Whether the notification is open
   */
  open: boolean;

  /**
   * Notification title (optional)
   */
  title?: string;

  /**
   * Success message to display
   */
  message: string;

  /**
   * Auto-hide duration in milliseconds (default: 6000)
   */
  autoHideDuration?: number;

  /**
   * Callback when notification is closed
   */
  onClose: () => void;

  /**
   * Vertical position (default: 'top')
   */
  vertical?: 'top' | 'bottom';

  /**
   * Horizontal position (default: 'center')
   */
  horizontal?: 'left' | 'center' | 'right';

  /**
   * Custom action button
   */
  action?: React.ReactNode;
}

export const SuccessNotification: React.FC<SuccessNotificationProps> = ({
  open,
  title,
  message,
  autoHideDuration = 6000,
  onClose,
  vertical = 'top',
  horizontal = 'center',
  action
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical, horizontal }}
    >
      <Alert
        icon={<CheckCircleIcon />}
        severity="success"
        onClose={onClose}
        action={
          action || (
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={onClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )
        }
        sx={{ width: '100%' }}
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {message}
      </Alert>
    </Snackbar>
  );
};

/**
 * Specific success notification components for common scenarios
 */

export const UploadSuccessNotification: React.FC<{
  open: boolean;
  filename: string;
  onClose: () => void;
}> = ({ open, filename, onClose }) => (
  <SuccessNotification
    open={open}
    title="Upload Successful"
    message={`File "${filename}" has been uploaded and is being processed.`}
    onClose={onClose}
  />
);

export const CalculationSuccessNotification: React.FC<{
  open: boolean;
  pointCount: number;
  duration: number;
  onClose: () => void;
}> = ({ open, pointCount, duration, onClose }) => (
  <SuccessNotification
    open={open}
    title="Calculation Complete"
    message={`Successfully calculated ${pointCount} survey points in ${duration}s.`}
    onClose={onClose}
  />
);

export const InterpolationSuccessNotification: React.FC<{
  open: boolean;
  pointCount: number;
  resolution: number;
  onClose: () => void;
}> = ({ open, pointCount, resolution, onClose }) => (
  <SuccessNotification
    open={open}
    title="Interpolation Complete"
    message={`Successfully interpolated ${pointCount} points at ${resolution}m resolution.`}
    onClose={onClose}
  />
);

export const DownloadSuccessNotification: React.FC<{
  open: boolean;
  format: string;
  onClose: () => void;
}> = ({ open, format, onClose }) => (
  <SuccessNotification
    open={open}
    title="Download Started"
    message={`Your survey data is being downloaded in ${format} format.`}
    onClose={onClose}
    autoHideDuration={3000}
  />
);

export const DeleteSuccessNotification: React.FC<{
  open: boolean;
  itemName: string;
  onClose: () => void;
}> = ({ open, itemName, onClose }) => (
  <SuccessNotification
    open={open}
    title="Deleted Successfully"
    message={`"${itemName}" has been deleted.`}
    onClose={onClose}
    autoHideDuration={4000}
  />
);
