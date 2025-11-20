import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import { LoginForm } from '../components/forms/LoginForm';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';

export const LoginPage: React.FC = () => {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
        }}
      >
        <LanguageSwitcher />
      </Box>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <LoginForm />
        </Paper>
      </Box>
    </Container>
  );
};
