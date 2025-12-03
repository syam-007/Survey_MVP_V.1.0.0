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
import config from '../../config/env';

interface DownloadButtonProps {
  surveyId: string;
  dataType: 'calculated' | 'interpolated';
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  // For interpolated downloads: use fresh calculation instead of saved data
  resolution?: number;
  startMD?: number;
  endMD?: number;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  surveyId,
  dataType,
  variant = 'outlined',
  size = 'medium',
  resolution,
  startMD,
  endMD
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
      // Validate surveyId
      if (!surveyId) {
        throw new Error('Survey ID is missing. Please reload the page and try again.');
      }

      console.log(`Downloading ${dataType} survey as ${format}:`, surveyId);

      const endpoint = dataType === 'calculated'
        ? `/api/v1/surveys/export/calculated/${surveyId}/`
        : `/api/v1/surveys/export/interpolated/${surveyId}/`;

      const url = `${config.apiBaseUrl}${endpoint}?format=${format}`;
      console.log('Download URL:', url);

      // Fetch with authentication headers
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `survey_${dataType}_${surveyId}.${format === 'excel' ? 'xlsx' : 'csv'}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/"/g, '');
        }
      }

      // Get blob from response
      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(downloadUrl);

      console.log(`Successfully downloaded ${filename}`);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Failed to download ${dataType} survey data. Please try again.`);
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
