import React from 'react';
import { Box, Container, Typography, Button, Paper } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../stores/hooks';
import { logoutUser } from '../stores/authSlice';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Paper elevation={2} sx={{ p: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Dashboard
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Welcome, {user?.first_name || user?.username}!
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              <strong>Email:</strong> {user?.email}
            </Typography>
            <Typography variant="body1">
              <strong>Username:</strong> {user?.username}
            </Typography>
            {user?.first_name && (
              <Typography variant="body1">
                <strong>Name:</strong> {user.first_name} {user.last_name}
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            color="secondary"
            onClick={handleLogout}
            sx={{ mt: 3 }}
          >
            Logout
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};
