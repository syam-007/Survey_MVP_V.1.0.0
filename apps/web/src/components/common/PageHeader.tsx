import React from 'react';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const handleBreadcrumbClick = (path: string) => () => {
    console.log('Navigating to:', path);
    navigate(path);
  };

  return (
    <Box sx={{ mb: 3, position: 'relative', zIndex: 10 }}>
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
                component="button"
                onClick={handleBreadcrumbClick(crumb.path)}
                underline="hover"
                color="inherit"
                sx={{
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.main' },
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  font: 'inherit'
                }}
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
