/**
 * Environment Configuration
 * Centralized environment variable management for the application
 */

interface AppConfig {
  environment: string;
  apiBaseUrl: string;
  isDevelopment: boolean;
  isLocal: boolean;
}

/**
 * Get the API base URL based on environment configuration
 */
const getApiBaseUrl = (): string => {
  const environment = import.meta.env.VITE_ENVIRONMENT;
  const apiUrl = import.meta.env.VITE_API_URL;

  console.log('🔍 Environment Debug:', {
    VITE_ENVIRONMENT: environment,
    VITE_API_URL: apiUrl,
    'import.meta.env.DEV': import.meta.env.DEV,
    'import.meta.env.PROD': import.meta.env.PROD,
    'import.meta.env.MODE': import.meta.env.MODE,
  });

  // If environment is explicitly set to "local", use localhost
  if (environment === 'local') {
    console.log('✅ Using LOCAL environment → http://localhost:8000');
    return 'http://localhost:8000';
  }

  // For development or production (server-side), use the configured API URL
  if (environment === 'development' && apiUrl) {
    // Remove trailing slash if present for consistency
    const url = apiUrl.replace(/\/$/, '');
    console.log(`✅ Using DEVELOPMENT environment → ${url}`);
    return url;
  }

  // Fallback to localhost if no configuration is provided
  console.warn('⚠️ No environment configuration found. Defaulting to localhost:8000');
  return 'http://localhost:8000';
};

/**
 * Application configuration object
 */
export const config: AppConfig = {
  environment: import.meta.env.VITE_ENVIRONMENT || 'local',
  apiBaseUrl: getApiBaseUrl(),
  isDevelopment: import.meta.env.VITE_ENVIRONMENT === 'development',
  isLocal: import.meta.env.VITE_ENVIRONMENT === 'local',
};

/**
 * Log configuration on app startup (only in development)
 */
if (import.meta.env.DEV) {
  console.log('🔧 App Configuration:', {
    environment: config.environment,
    apiBaseUrl: config.apiBaseUrl,
    isDevelopment: config.isDevelopment,
    isLocal: config.isLocal,
  });
}

export default config;
