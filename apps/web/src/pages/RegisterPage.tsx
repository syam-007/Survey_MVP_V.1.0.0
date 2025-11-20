import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import { RegisterForm } from '../components/forms/RegisterForm';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';

export const RegisterPage: React.FC = () => {
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
          <RegisterForm />
        </Paper>
      </Box>
    </Container>
  );
};
