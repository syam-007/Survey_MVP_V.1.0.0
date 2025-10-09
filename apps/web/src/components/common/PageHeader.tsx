import React from 'react';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface Breadcrumb {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

/**
 * PageHeader Component
 * Displays page title, breadcrumbs, and action buttons
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  breadcrumbs = [],
  actions,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
          sx={{ mb: 1 }}
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            if (isLast || !crumb.path) {
              return (
                <Typography key={index} color="text.primary">
                  {crumb.label}
                </Typography>
              );
            }

            return (
              <MuiLink
                key={index}
                component={RouterLink}
                to={crumb.path}
                underline="hover"
                color="inherit"
              >
                {crumb.label}
              </MuiLink>
            );
          })}
        </Breadcrumbs>
      )}

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
      >
        <Typography variant="h4" component="h1">
          {title}
        </Typography>

        {actions && <Box>{actions}</Box>}
      </Box>
    </Box>
  );
};
