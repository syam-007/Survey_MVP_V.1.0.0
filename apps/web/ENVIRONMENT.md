# Environment Configuration Guide

This project uses Vite's environment variable system to manage API configurations for different environments.

## Environment Variables

The application uses two key environment variables:

- **`VITE_ENVIRONMENT`**: Specifies the environment type (`local` or `development`)
- **`VITE_API_URL`**: The base URL for API calls

## Environment Files

### `.env.local` (For Local Development)
```env
VITE_ENVIRONMENT=local
VITE_API_URL=http://localhost:8000
```

- Used for local development with backend running on `localhost:8000`
- **Git ignored** (won't be committed to repository)
- Loaded in development mode (overrides base .env)

### `.env.production` (For Production Builds)
```env
VITE_ENVIRONMENT=development
VITE_API_URL=https://survey.task.energy
```

- Used for production deployments
- **Can be committed** to repository
- Only loaded during production builds (`npm run build`)

### `.env.example` (Template)
```env
VITE_ENVIRONMENT=local
VITE_API_URL=http://localhost:8000
```

- Template file showing required environment variables
- **Should be committed** to repository
- Copy this to `.env.local` to get started

## How It Works

The application configuration (`src/config/env.ts`) determines the API base URL based on `VITE_ENVIRONMENT`:

1. **When `VITE_ENVIRONMENT=local`**:
   - API calls go to `http://localhost:8000`
   - Ignores `VITE_API_URL` value

2. **When `VITE_ENVIRONMENT=development`**:
   - API calls go to the URL specified in `VITE_API_URL`
   - For example: `https://survey.task.energy`

## Setup Instructions

### For Local Development

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Ensure `.env.local` contains:
   ```env
   VITE_ENVIRONMENT=local
   VITE_API_URL=http://localhost:8000
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. The app will connect to `http://localhost:8000`

### For Deployment

1. Ensure `.env.production` exists with:
   ```env
   VITE_ENVIRONMENT=development
   VITE_API_URL=https://survey.task.energy
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. The built app will connect to `https://survey.task.energy`

## Priority Order

Vite loads environment variables based on mode:

**Development Mode** (`npm run dev`):
1. `.env` (base configuration)
2. `.env.local` (git-ignored, overrides base)

**Production Mode** (`npm run build`):
1. `.env` (base configuration)
2. `.env.production` (committed to git)
3. `.env.production.local` (if exists, git-ignored)

## Troubleshooting

### API calls going to wrong URL

1. Check which environment file is being used:
   ```bash
   # On Windows
   type .env.local

   # On macOS/Linux
   cat .env.local
   ```

2. Verify `VITE_ENVIRONMENT` value matches your intent

3. Check browser console on app startup for configuration log:
   ```
   🔧 App Configuration: {
     environment: 'local',
     apiBaseUrl: 'http://localhost:8000',
     isDevelopment: false,
     isLocal: true
   }
   ```

### Environment variables not updating

1. Restart the Vite dev server (environment variables are loaded at startup)
2. Clear browser cache and reload
3. Check that variable names start with `VITE_` prefix

## Important Notes

- ⚠️ **Never commit `.env.local`** - it's for your local development only
- ✅ **Do commit `.env.production`** - it's needed for deployment
- ✅ **Do commit `.env.example`** - it helps other developers set up
- 🔄 **Restart dev server** after changing environment files
- 🔒 **Never commit sensitive data** in any `.env` file
- 📝 **`.env.production` is only used during builds**, not in dev mode

## Usage in Code

All services automatically use the centralized configuration:

```typescript
import config from './config/env';

// Access the API base URL
const apiUrl = config.apiBaseUrl;

// Check environment
if (config.isLocal) {
  console.log('Running locally');
}

if (config.isDevelopment) {
  console.log('Running in development/production');
}
```

## Files Modified

The following files use the centralized configuration:

- `src/config/env.ts` - Central configuration
- `src/services/*.ts` - All service files
- `src/stores/*.ts` - All Redux store slices
- `src/vite-env.d.ts` - TypeScript definitions

## Need Help?

If you encounter issues with environment configuration:

1. Check this guide
2. Verify your `.env.local` file exists and has correct values
3. Restart the dev server
4. Check browser console for configuration logs
5. Contact the development team

---

Last updated: 2025-11-11
