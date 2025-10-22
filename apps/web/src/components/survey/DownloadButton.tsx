/**
 * DownloadButton Component
 *
 * Provides dropdown menu to download survey results in Excel or CSV format.
 * Supports both calculated and interpolated survey data.
 */
import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  CircularProgress,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import TableChartIcon from '@mui/icons-material/TableChart';

interface DownloadButtonProps {
  surveyId: string;
  dataType: 'calculated' | 'interpolated';
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  surveyId,
  dataType,
  variant = 'outlined',
  size = 'medium'
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDownload = async (format: 'excel' | 'csv') => {
    setIsDownloading(true);
    handleClose();

    try {
      const endpoint = dataType === 'calculated'
        ? `/api/v1/surveys/export/calculated/${surveyId}/`
        : `/api/v1/surveys/export/interpolated/${surveyId}/`;

      const url = `${endpoint}?format=${format}`;

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        startIcon={isDownloading ? <CircularProgress size={20} /> : <DownloadIcon />}
        onClick={handleClick}
        disabled={isDownloading}
      >
        Download {dataType === 'calculated' ? 'Calculated' : 'Interpolated'}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={() => handleDownload('excel')}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Excel (.xlsx)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDownload('csv')}>
          <ListItemIcon>
            <InsertDriveFileIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>CSV (.csv)</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
