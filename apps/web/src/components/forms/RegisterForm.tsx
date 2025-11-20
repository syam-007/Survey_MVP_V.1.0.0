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
import { registerUser, clearError } from '../../stores/authSlice';
import { useNavigate } from 'react-router-dom';

export const RegisterForm: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
  });
  const [validationError, setValidationError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = (): boolean => {
    if (
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.password_confirm
    ) {
      setValidationError(t('validation.required'));
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setValidationError(t('validation.invalidEmail'));
      return false;
    }

    if (formData.password.length < 8) {
      setValidationError(t('validation.minLength', { min: 8 }));
      return false;
    }

    if (formData.password !== formData.password_confirm) {
      setValidationError(t('validation.passwordMismatch'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    dispatch(clearError());

    if (!validateForm()) {
      return;
    }

    try {
      const result = await dispatch(registerUser(formData)).unwrap();
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
        {t('auth.registerTitle')}
      </Typography>

      {(error || validationError) && (
        <Alert severity="error">{error || validationError}</Alert>
      )}

      <TextField
        label={t('auth.username')}
        name="username"
        value={formData.username}
        onChange={handleChange}
        required
        fullWidth
        disabled={loading}
      />

      <TextField
        label={t('auth.email')}
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        required
        fullWidth
        disabled={loading}
      />

      <TextField
        label={t('auth.firstName')}
        name="first_name"
        value={formData.first_name}
        onChange={handleChange}
        fullWidth
        disabled={loading}
      />

      <TextField
        label={t('auth.lastName')}
        name="last_name"
        value={formData.last_name}
        onChange={handleChange}
        fullWidth
        disabled={loading}
      />

      <TextField
        label={t('auth.password')}
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        required
        fullWidth
        disabled={loading}
        helperText={t('validation.minLength', { min: 8 })}
      />

      <TextField
        label={t('auth.confirmPassword')}
        name="password_confirm"
        type="password"
        value={formData.password_confirm}
        onChange={handleChange}
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
        {loading ? <CircularProgress size={24} /> : t('auth.register')}
      </Button>

      <Typography variant="body2" textAlign="center" sx={{ mt: 2 }}>
        {t('auth.alreadyHaveAccount')}{' '}
        <MuiLink
          component="button"
          variant="body2"
          onClick={(e) => {
            e.preventDefault();
            navigate('/login');
          }}
        >
          {t('auth.login')}
        </MuiLink>
      </Typography>
    </Box>
  );
};
