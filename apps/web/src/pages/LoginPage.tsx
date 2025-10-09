import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import { LoginForm } from '../components/forms/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <Container maxWidth="sm">
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
