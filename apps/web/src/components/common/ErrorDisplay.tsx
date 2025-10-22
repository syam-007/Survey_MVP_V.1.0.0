/**
 * ErrorDisplay Component
 *
 * Displays error messages in a user-friendly format with retry capability.
 * Supports validation errors, upload failures, and calculation errors.
 */
import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Collapse
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

export interface ValidationError {
  field?: string;
  message: string;
  code?: string;
}

export interface ErrorDisplayProps {
  /**
   * Error title (e.g., "Upload Failed", "Calculation Error")
   */
  title?: string;

  /**
   * Main error message
   */
  message: string | Error;

  /**
   * Array of validation errors for detailed display
   */
  validationErrors?: ValidationError[];

  /**
   * Error severity level
   */
  severity?: 'error' | 'warning' | 'info';

  /**
   * Show retry button
   */
  showRetry?: boolean;

  /**
   * Retry callback
   */
  onRetry?: () => void;

  /**
   * Custom action button
   */
  actionButton?: React.ReactNode;

  /**
   * Whether to show detailed error information collapsed initially
   */
  collapsible?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Error',
  message,
  validationErrors,
  severity = 'error',
  showRetry = false,
  onRetry,
  actionButton,
  collapsible = false
}) => {
  const [expanded, setExpanded] = React.useState(!collapsible);

  // Extract error message from Error object or string
  const errorMessage = typeof message === 'string'
    ? message
    : message.message || 'An unexpected error occurred';

  // Check if there are validation errors
  const hasValidationErrors = validationErrors && validationErrors.length > 0;

  return (
    <Alert
      severity={severity}
      icon={<ErrorOutlineIcon />}
      action={
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          {showRetry && onRetry && (
            <Button
              size="small"
              color="inherit"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
          {actionButton}
          {collapsible && hasValidationErrors && (
            <Button
              size="small"
              color="inherit"
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Hide Details' : 'Show Details'}
            </Button>
          )}
        </Box>
      }
      sx={{ mb: 2 }}
    >
      <AlertTitle>{title}</AlertTitle>
      <Typography variant="body2" gutterBottom>
        {errorMessage}
      </Typography>

      {/* Validation Errors List */}
      {hasValidationErrors && (
        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Validation Errors:
            </Typography>
            <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, p: 1 }}>
              {validationErrors.map((error, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ErrorOutlineIcon fontSize="small" color={severity} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      error.field ? (
                        <Typography variant="body2">
                          <strong>{error.field}:</strong> {error.message}
                        </Typography>
                      ) : (
                        <Typography variant="body2">{error.message}</Typography>
                      )
                    }
                    secondary={error.code ? `Error code: ${error.code}` : undefined}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Collapse>
      )}
    </Alert>
  );
};

/**
 * Specific error display components for common scenarios
 */

export const UploadErrorDisplay: React.FC<{
  error: string | Error;
  validationErrors?: ValidationError[];
  onRetry?: () => void;
}> = ({ error, validationErrors, onRetry }) => (
  <ErrorDisplay
    title="Upload Failed"
    message={error}
    validationErrors={validationErrors}
    severity="error"
    showRetry={!!onRetry}
    onRetry={onRetry}
    collapsible={validationErrors && validationErrors.length > 3}
  />
);

export const CalculationErrorDisplay: React.FC<{
  error: string | Error;
  onRetry?: () => void;
}> = ({ error, onRetry }) => (
  <ErrorDisplay
    title="Calculation Failed"
    message={error}
    severity="error"
    showRetry={!!onRetry}
    onRetry={onRetry}
  />
);

export const ValidationWarningDisplay: React.FC<{
  message: string;
  validationErrors: ValidationError[];
}> = ({ message, validationErrors }) => (
  <ErrorDisplay
    title="Validation Warnings"
    message={message}
    validationErrors={validationErrors}
    severity="warning"
    collapsible={validationErrors.length > 3}
  />
);

export const ProcessingErrorDisplay: React.FC<{
  stage: string;
  error: string | Error;
  onRetry?: () => void;
}> = ({ stage, error, onRetry }) => (
  <ErrorDisplay
    title={`${stage} Failed`}
    message={error}
    severity="error"
    showRetry={!!onRetry}
    onRetry={onRetry}
  />
);
