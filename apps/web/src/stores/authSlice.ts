import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import authService from '../services/authService';
import type {
  AuthState,
  LoginCredentials,
  RegisterData,
  AuthTokens,
} from '../types/auth.types';

const initialState: AuthState = {
  user: authService.getStoredUser(),
  tokens: {
    access: authService.getAccessToken() || '',
    refresh: authService.getRefreshToken() || '',
  },
  isAuthenticated: authService.isAuthenticated(),
  loading: false,
  error: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      if (response.success && response.data) {
        return {
          user: response.data.user,
          tokens: response.data.tokens,
        };
      }
      return rejectWithValue(response.message);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      if (response.success && response.data) {
        return {
          user: response.data.user,
          tokens: response.data.tokens,
        };
      }
      return rejectWithValue(response.errors || response.message);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const refreshUserData = createAsyncThunk('auth/refreshUserData', async () => {
  const user = await authService.getCurrentUser();
  return user;
});

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.error = null;
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.error = action.payload as string;
    });

    // Register
    builder.addCase(registerUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(registerUser.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.error = null;
    });
    builder.addCase(registerUser.rejected, (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.error = JSON.stringify(action.payload);
    });

    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;
    });

    // Refresh user data
    builder.addCase(refreshUserData.fulfilled, (state, action) => {
      if (action.payload) {
        state.user = action.payload;
      }
    });
  },
});

export const { clearError, updateTokens } = authSlice.actions;
export default authSlice.reducer;
