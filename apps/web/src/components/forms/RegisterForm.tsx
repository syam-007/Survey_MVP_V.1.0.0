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
import { useAppDispatch, useAppSelector } from '../../stores/hooks';
import { registerUser, clearError } from '../../stores/authSlice';
import { useNavigate } from 'react-router-dom';

export const RegisterForm: React.FC = () => {
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
      setValidationError('Please fill in all required fields');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setValidationError('Please enter a valid email');
      return false;
    }

    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return false;
    }

    if (formData.password !== formData.password_confirm) {
      setValidationError('Passwords do not match');
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
        Register
      </Typography>

      {(error || validationError) && (
        <Alert severity="error">{error || validationError}</Alert>
      )}

      <TextField
        label="Username"
        name="username"
        value={formData.username}
        onChange={handleChange}
        required
        fullWidth
        disabled={loading}
      />

      <TextField
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        required
        fullWidth
        disabled={loading}
      />

      <TextField
        label="First Name"
        name="first_name"
        value={formData.first_name}
        onChange={handleChange}
        fullWidth
        disabled={loading}
      />

      <TextField
        label="Last Name"
        name="last_name"
        value={formData.last_name}
        onChange={handleChange}
        fullWidth
        disabled={loading}
      />

      <TextField
        label="Password"
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        required
        fullWidth
        disabled={loading}
        helperText="Minimum 8 characters"
      />

      <TextField
        label="Confirm Password"
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
        {loading ? <CircularProgress size={24} /> : 'Register'}
      </Button>

      <Typography variant="body2" textAlign="center" sx={{ mt: 2 }}>
        Already have an account?{' '}
        <MuiLink
          component="button"
          variant="body2"
          onClick={(e) => {
            e.preventDefault();
            navigate('/login');
          }}
        >
          Login here
        </MuiLink>
      </Typography>
    </Box>
  );
};
