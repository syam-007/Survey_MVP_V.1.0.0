/**
 * ActivityLogDialog Component
 *
 * Full-screen dialog to display activity logs with timeline.
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Slide,
  AppBar,
  Toolbar,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Close as CloseIcon,
  History as HistoryIcon,
  DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import { ActivityLogTimeline } from './ActivityLogTimeline';
import activityLogService from '../../services/activityLogService';

const Transition = React.forwardRef(function Transition(
  props: any,
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface ActivityLogDialogProps {
  open: boolean;
  runId: string;
  runName: string;
  onClose: () => void;
}

export const ActivityLogDialog: React.FC<ActivityLogDialogProps> = ({
  open,
  runId,
  runName,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleClearAllLogs = async () => {
    if (!confirm('Are you sure you want to delete all activity logs for this run? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError(null);
      const result = await activityLogService.deleteAllByRun(runId);
      setDeleteSuccess(true);
      setRefreshKey(prev => prev + 1); // Force refresh of timeline
      console.log(result.message);
    } catch (error: any) {
      console.error('Failed to delete activity logs:', error);
      setDeleteError(error.response?.data?.error || 'Failed to delete activity logs');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setDeleteSuccess(false);
    setDeleteError(null);
  };

  return (
    <>
      <Dialog
        fullScreen
        open={open}
        onClose={onClose}
        TransitionComponent={Transition}
      >
        <AppBar sx={{ position: 'relative' }} elevation={1}>
          <Toolbar>
            <HistoryIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flex: 1 }}>
              Activity Log - {runName}
            </Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={onClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <DialogContent sx={{ bgcolor: 'grey.50', py: 4 }}>
          <Box maxWidth="lg" mx="auto">
            <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Complete audit trail of all activities performed on this run. Track who did what and when.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteSweepIcon />}
                onClick={handleClearAllLogs}
                disabled={isDeleting}
                size="small"
              >
                {isDeleting ? 'Clearing...' : 'Clear All Logs'}
              </Button>
            </Box>

            <ActivityLogTimeline key={refreshKey} runId={runId} pageSize={15} />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={deleteSuccess}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          All activity logs have been deleted successfully
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!deleteError}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {deleteError}
        </Alert>
      </Snackbar>
    </>
  );
};
