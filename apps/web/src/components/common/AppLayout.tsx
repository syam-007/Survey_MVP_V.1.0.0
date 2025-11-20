import React, { ReactNode } from 'react';
import { Box, AppBar, Toolbar, Typography, Container } from '@mui/material';
import { LanguageSwitcher } from './LanguageSwitcher';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

/**
 * AppLayout Component
 * Main application layout with top bar and language switcher
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children, title }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title || 'Survey Management System'}
          </Typography>
          <LanguageSwitcher />
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Box>
    </Box>
  );
};
