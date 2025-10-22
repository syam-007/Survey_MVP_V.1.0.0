/**
 * SurveyFileList Component
 *
 * Displays all survey files for a run with status badges and actions.
 * Supports viewing results and deleting files.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

interface SurveyFile {
  id: string;
  filename: string;
  survey_type: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  upload_date: string;
  file_size: number;
  survey_data_id?: string;
}

interface SurveyFileListProps {
  runId: string;
  surveyFiles: SurveyFile[];
  isLoading?: boolean;
  error?: string | null;
  onDelete?: (fileId: string) => Promise<void>;
  onRefresh?: () => void;
}

export const SurveyFileList: React.FC<SurveyFileListProps> = ({
  runId,
  surveyFiles,
  isLoading = false,
  error = null,
  onDelete,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<SurveyFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleViewResults = (file: SurveyFile) => {
    console.log('View results clicked:', {
      file,
      survey_data_id: file.survey_data_id,
      processing_status: file.processing_status,
      runId,
      targetUrl: `/runs/${runId}/surveys/${file.survey_data_id}`
    });

    if (file.survey_data_id && file.processing_status === 'completed') {
      navigate(`/runs/${runId}/surveys/${file.survey_data_id}`);
    } else {
      console.warn('Cannot navigate - missing survey_data_id or not completed:', {
        has_survey_data_id: !!file.survey_data_id,
        is_completed: file.processing_status === 'completed'
      });
    }
  };

  const handleDeleteClick = (file: SurveyFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(fileToDelete.id);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setFileToDelete(null);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Chip
            icon={<CheckCircleIcon />}
            label="Completed"
            color="success"
            size="small"
          />
        );
      case 'processing':
        return (
          <Chip
            icon={<CircularProgress size={16} />}
            label="Processing"
            color="info"
            size="small"
          />
        );
      case 'failed':
        return (
          <Chip
            icon={<ErrorIcon />}
            label="Failed"
            color="error"
            size="small"
          />
        );
      case 'pending':
        return (
          <Chip
            icon={<HourglassEmptyIcon />}
            label="Pending"
            color="default"
            size="small"
          />
        );
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (surveyFiles.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          No survey files uploaded yet. Click "Upload Survey File" to add survey data.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper sx={{ width: '100%' }}>
        <List>
          {surveyFiles.map((file, index) => (
            <ListItem
              key={file.id}
              divider={index < surveyFiles.length - 1}
              sx={{
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body1" fontWeight="medium">
                      {file.filename}
                    </Typography>
                    {getStatusChip(file.processing_status)}
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary" component="span">
                      {file.survey_type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ mx: 1 }}>
                      •
                    </Typography>
                    <Typography variant="body2" color="text.secondary" component="span">
                      {formatFileSize(file.file_size)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ mx: 1 }}>
                      •
                    </Typography>
                    <Typography variant="body2" color="text.secondary" component="span">
                      Uploaded {formatDate(file.upload_date)}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="View Results">
                    <span>
                      <IconButton
                        edge="end"
                        aria-label="view results"
                        onClick={() => handleViewResults(file)}
                        disabled={file.processing_status !== 'completed' || !file.survey_data_id}
                        color="primary"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {onDelete && (
                    <Tooltip title="Delete File">
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteClick(file)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Survey File</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{fileToDelete?.filename}"?
            This action cannot be undone and will remove all associated survey data and calculations.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
