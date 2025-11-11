import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { LoginCredentials, RegisterData, AuthResponse, AuthTokens, User } from '../types/auth.types';

const API_BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_API_URL) || 'https://survey.task.energy/';

class AuthService {
  private api: AxiosInstance;
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include access token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            if (newAccessToken) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/v1/auth/register', data);

      if (response.data.success && response.data.data) {
        this.saveAuthData(response.data.data.tokens, response.data.data.user);
      }

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
        errors: error.response?.data?.errors,
      };
    }
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/v1/auth/login', credentials);

      if (response.data.success && response.data.data) {
        this.saveAuthData(response.data.data.tokens, response.data.data.user);
      }

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();

    if (refreshToken) {
      try {
        await this.api.post('/api/v1/auth/logout', { refresh: refreshToken });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }

    this.clearAuthData();
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await axios.post<{ access: string }>(
        `${API_BASE_URL}/api/v1/auth/refresh`,
        { refresh: refreshToken }
      );

      const newAccessToken = response.data.access;
      this.saveAccessToken(newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.api.get<{ success: boolean; data: { user: User } }>(
        '/api/v1/auth/me'
      );

      if (response.data.success) {
        const user = response.data.data.user;
        this.saveUser(user);
        return user;
      }
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Save authentication data to localStorage
   */
  private saveAuthData(tokens: AuthTokens, user: User): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.access);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Save access token
   */
  private saveAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  /**
   * Save user data
   */
  private saveUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Clear all authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get stored user data
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export default new AuthService();
