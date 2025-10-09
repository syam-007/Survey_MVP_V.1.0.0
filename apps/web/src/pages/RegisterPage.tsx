import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import { RegisterForm } from '../components/forms/RegisterForm';

export const RegisterPage: React.FC = () => {
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
          <RegisterForm />
        </Paper>
      </Box>
    </Container>
  );
};
