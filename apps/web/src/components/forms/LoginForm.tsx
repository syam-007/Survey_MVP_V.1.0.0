import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link as MuiLink,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../stores/hooks';
import { loginUser, clearError } from '../../stores/authSlice';
import { useNavigate } from 'react-router-dom';

export const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    dispatch(clearError());

    // Validation
    if (!email || !password) {
      setValidationError(t('validation.required'));
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setValidationError(t('validation.invalidEmail'));
      return;
    }

    try {
      const result = await dispatch(loginUser({ email, password })).unwrap();
      if (result) {
        navigate('/dashboard');
      }
    } catch (err) {
      // Error handled by Redux
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
        maxWidth: 400,
        mx: 'auto',
      }}
    >
      <Typography variant="h4" component="h1" textAlign="center" gutterBottom>
        {t('auth.loginTitle')}
      </Typography>

      {(error || validationError) && (
        <Alert severity="error">{error || validationError}</Alert>
      )}

      <TextField
        label={t('auth.email')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        fullWidth
        disabled={loading}
      />

      <TextField
        label={t('auth.password')}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        fullWidth
        disabled={loading}
      />

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading}
        sx={{ mt: 1 }}
      >
        {loading ? <CircularProgress size={24} /> : t('auth.login')}
      </Button>

      {/* <Typography variant="body2" textAlign="center" sx={{ mt: 2 }}>
        {t('auth.dontHaveAccount')}{' '}
        <MuiLink
          component="button"
          variant="body2"
          onClick={(e) => {
            e.preventDefault();
            navigate('/register');
          }}
        >
          {t('auth.register')}
        </MuiLink>
      </Typography> */}
    </Box>
  );
};
