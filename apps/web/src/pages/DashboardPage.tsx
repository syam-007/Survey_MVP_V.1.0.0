import React from 'react';
import { Box, Container, Typography, Button, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../stores/hooks';
import { logoutUser } from '../stores/authSlice';
import { useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h3" component="h1">
              {t('navigation.dashboard')}
            </Typography>
            <LanguageSwitcher />
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            {t('common.welcome')}, {user?.first_name || user?.username}!
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              <strong>{t('auth.email')}:</strong> {user?.email}
            </Typography>
            <Typography variant="body1">
              <strong>{t('auth.username')}:</strong> {user?.username}
            </Typography>
            {user?.first_name && (
              <Typography variant="body1">
                <strong>{t('common.name')}:</strong> {user.first_name} {user.last_name}
              </Typography>
            )}
          </Box>

          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('navigation.navigation')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={() => navigate('/jobs')}
              >
                {t('navigation.jobs')}
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/runs')}
              >
                {t('navigation.runs')}
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/wells')}
              >
                {t('navigation.wells')}
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/configuration')}
              >
                {t('navigation.configuration')}
              </Button>
              {user?.role === 'Admin' && (
                <Button
                  variant="contained"
                  onClick={() => navigate('/users')}
                >
                  {t('navigation.users')}
                </Button>
              )}
            </Box>
          </Box>

          <Button
            variant="contained"
            color="secondary"
            onClick={handleLogout}
            sx={{ mt: 3 }}
          >
            {t('navigation.logout')}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};
