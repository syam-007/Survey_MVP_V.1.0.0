# Frontend Test Patterns

This document provides working test patterns for the Survey Management System frontend, established during Story 2.6 (Fix Frontend Test Infrastructure).

## Environment

- **React:** 19.1.1
- **Testing Library React:** 16.3.0
- **Testing Library DOM:** 15.1.1
- **Jest:** 29+
- **ts-jest:** Latest
- **TypeScript:** 5.3+

## Table of Contents

1. [Service Layer Tests (Axios + MockAdapter)](#service-layer-tests)
2. [RTK Query Slice Tests](#rtk-query-slice-tests)
3. [Component Tests (React Testing Library)](#component-tests)
4. [Jest Configuration](#jest-configuration)
5. [Common Patterns](#common-patterns)

---

## Service Layer Tests

### Pattern: Testing Axios Services with MockAdapter

**File:** `apps/web/src/services/__tests__/runsService.test.ts`

#### Key Points

1. **MockAdapter Type:** Use `InstanceType<typeof MockAdapter>` for proper typing
2. **Test Environment:** Interceptors are disabled in test mode - no need to mock authService
3. **import.meta.env:** Services use `process.env` fallback for Jest compatibility

#### Example

```typescript
import MockAdapter from 'axios-mock-adapter';
import type { PaginatedRunResponse } from '../../types/run.types';

// Mock authService BEFORE imports (though not strictly needed)
const mockGetAccessToken = jest.fn(() => 'mock-access-token');
jest.mock('../authService', () => ({
  default: {
    getAccessToken: mockGetAccessToken,
    refreshAccessToken: jest.fn(),
  },
}));

// Import service AFTER mocks
import runsService from '../runsService';

describe('RunsService', () => {
  let mockAxios: InstanceType<typeof MockAdapter>;

  beforeEach(() => {
    // Apply MockAdapter to service's axios instance
    mockAxios = new MockAdapter(runsService.getAxiosInstance());
    // Note: authService mocks not needed - interceptors disabled in test
  });

  afterEach(() => {
    mockAxios.reset();
    mockAxios.restore();
    jest.clearAllMocks();
  });

  it('should fetch runs without filters', async () => {
    const mockResponse: PaginatedRunResponse = {
      count: 2,
      next: null,
      previous: null,
      page: 1,
      total_pages: 1,
      page_size: 20,
      results: [mockRun1, mockRun2],
    };

    mockAxios.onGet('http://localhost:8000/api/v1/runs/?').reply(200, mockResponse);

    const result = await runsService.getRuns();

    expect(result).toEqual(mockResponse);
    expect(result.count).toBe(2);
  });

  it('should handle 404 error', async () => {
    mockAxios.onGet(/\/api\/v1\/runs\/.*/).reply(404);

    await expect(runsService.getRuns()).rejects.toThrow('Run not found');
  });
});
```

#### Service Implementation Requirements

For services to work with MockAdapter in tests:

```typescript
class RunsService {
  private api: AxiosInstance;

  // REQUIRED: Expose axios instance for testing
  public getAxiosInstance(): AxiosInstance {
    return this.api;
  }

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    // REQUIRED: Skip interceptors in test environment
    const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

    if (!isTestEnv) {
      // Add interceptors only in non-test environment
      this.api.interceptors.request.use(/* ... */);
      this.api.interceptors.response.use(/* ... */);
    }
  }
}

// REQUIRED: Use process.env for Jest compatibility
const API_BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_API_URL)
  || 'http://localhost:8000';
```

---

## RTK Query Slice Tests

### Pattern: Testing RTK Query without Accessing Internals

**File:** `apps/web/src/stores/__tests__/runsSlice.test.ts`

#### Key Points

1. **DO NOT** access internal properties like `.query`, `.providesTags`, `.invalidatesTags`
2. **DO** test endpoint configuration, hooks generation, and store integration
3. **Focus** on public API only

#### ❌ WRONG - Accessing Internal Properties

```typescript
// This will fail with TypeScript errors
it('should build correct URL', () => {
  const { query } = runsApi.endpoints.getRuns;  // ❌ .query doesn't exist
  const result = query();  // ❌ Cannot access
});
```

#### ✅ CORRECT - Testing Public API

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { runsApi } from '../runsSlice';

describe('runsSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        [runsApi.reducerPath]: runsApi.reducer,
        auth: () => mockAuthState.auth,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(runsApi.middleware),
    });
  });

  afterEach(() => {
    store.dispatch(runsApi.util.resetApiState());
  });

  // Test 1: Endpoint configuration
  it('should have correct endpoint names', () => {
    expect(runsApi.endpoints.getRuns).toBeDefined();
    expect(runsApi.endpoints.getRuns.name).toBe('getRuns');
  });

  // Test 2: Hooks generation
  it('should generate query hooks', () => {
    const { useGetRunsQuery, useGetRunByIdQuery } = runsApi;
    expect(typeof useGetRunsQuery).toBe('function');
    expect(typeof useGetRunByIdQuery).toBe('function');
  });

  // Test 3: Mutation hooks
  it('should generate mutation hooks', () => {
    const { useCreateRunMutation } = runsApi;
    expect(typeof useCreateRunMutation).toBe('function');
  });

  // Test 4: Store integration
  it('should integrate with Redux store', () => {
    const state = store.getState();
    expect(state[runsApi.reducerPath]).toBeDefined();
  });

  // Test 5: Middleware configuration
  it('should have middleware configured', () => {
    const state = store.getState();
    const apiState = state[runsApi.reducerPath];
    expect(apiState).toHaveProperty('queries');
    expect(apiState).toHaveProperty('mutations');
  });

  // Test 6: API utilities
  it('should have util methods', () => {
    expect(typeof runsApi.util.resetApiState).toBe('function');
    expect(typeof runsApi.util.invalidateTags).toBe('function');
    expect(typeof runsApi.util.upsertQueryData).toBe('function');
  });
}
```

#### What to Test

- ✅ Endpoint definitions exist
- ✅ Endpoint names are correct
- ✅ Hooks are generated
- ✅ Store integration works
- ✅ Middleware is configured
- ✅ Utility methods exist
- ❌ Internal query building (test via integration tests instead)
- ❌ Cache tag logic (test via integration tests instead)

---

## Component Tests

### Pattern: React Testing Library with React 19

**File:** `apps/web/src/pages/__tests__/RunListPage.test.tsx`

#### Key Points

1. **Import Pattern:** `render` from `@testing-library/react`, others from `@testing-library/dom`
2. **TextEncoder Required:** Must be polyfilled in setupTests.ts
3. **esModuleInterop:** Must be enabled in Jest config

#### Example

```typescript
import * as React from 'react';
import { render } from '@testing-library/react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

import { RunListPage } from '../runs/RunListPage';
import { runsApi } from '../../stores/runsSlice';

describe('RunListPage', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        [runsApi.reducerPath]: runsApi.reducer,
        auth: () => mockAuthState,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(runsApi.middleware),
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <BrowserRouter>{component}</BrowserRouter>
      </Provider>
    );
  };

  it('should render the page title', () => {
    renderWithProviders(<RunListPage />);

    expect(screen.getByText('Runs')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    renderWithProviders(<RunListPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

#### Testing Library Imports (React 19 + RTL v16)

```typescript
// ✅ CORRECT
import { render } from '@testing-library/react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';

// ❌ WRONG (will fail with TypeScript errors)
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
```

---

## Jest Configuration

### Required Setup

**File:** `apps/web/jest.config.js`

```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],

  // Module name mapping
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // CRITICAL: esModuleInterop for React default imports
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,              // ← REQUIRED
        allowSyntheticDefaultImports: true, // ← REQUIRED
      },
    }],
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Setup File

**File:** `apps/web/src/setupTests.ts`

```typescript
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// REQUIRED: Polyfill TextEncoder/TextDecoder for Node.js
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Mock window.matchMedia (required for Material-UI)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver (required for some components)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
} as any;
```

---

## Common Patterns

### 1. Mock Data Types

Always include ALL required fields in mock data:

```typescript
// ✅ CORRECT - Complete PaginatedResponse
const mockPaginatedResponse: PaginatedRunResponse = {
  count: 2,
  next: null,
  previous: null,
  page: 1,           // Required
  total_pages: 1,    // Required
  page_size: 20,     // Required
  results: [mockRun],
};

// ✅ CORRECT - Complete Run type
const mockRun: Run = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  run_number: 'RUN-001',
  run_name: 'Test Run',
  run_type: 'GTL',
  vertical_section: 1000,
  bhc_enabled: true,
  proposal_direction: null,
  grid_correction: 0.5,
  well: { /* ... */ },
  location: {          // Required
    latitude: 25.5,
    longitude: 55.3,
    easting: 500000,
    northing: 300000,
  },
  depth: {             // Required
    elevation_reference: 'MSL',
    reference_height: 100,
  },
  user: { /* ... */ },
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
};
```

### 2. Ordering Type with Const Assertion

```typescript
// ✅ CORRECT
const filters = {
  ordering: '-created_at' as const,
};

// ❌ WRONG - TypeScript will complain
const filters = {
  ordering: '-created_at',  // Type 'string' not assignable
};
```

### 3. Test Environment Detection

```typescript
const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnv) {
  // Production code (interceptors, etc.)
}
```

### 4. React Import Pattern

```typescript
// ✅ CORRECT - Namespace import
import * as React from 'react';

// ✅ ALSO WORKS - Default import (with esModuleInterop)
import React from 'react';
```

---

## Troubleshooting

### Issue: "Property 'screen' does not exist"

**Solution:** Import from `@testing-library/dom`, not `@testing-library/react`

```typescript
import { screen, waitFor, fireEvent } from '@testing-library/dom';
```

### Issue: "TextEncoder is not defined"

**Solution:** Add polyfill to `setupTests.ts`

```typescript
import { TextEncoder, TextDecoder } from 'util';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;
```

### Issue: "Module can only be default-imported using 'esModuleInterop'"

**Solution:** Add to Jest config transform

```javascript
transform: {
  '^.+\\.tsx?$': ['ts-jest', {
    tsconfig: {
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
  }],
}
```

### Issue: "Property 'query' does not exist on RTK Query endpoint"

**Solution:** Don't access internal properties. Test the public API instead (see RTK Query section above).

### Issue: MockAdapter not intercepting requests

**Solution:** Ensure interceptors are disabled in test mode:

```typescript
const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
if (!isTestEnv) {
  this.api.interceptors.request.use(/* ... */);
}
```

---

## Dependencies Required

```json
{
  "devDependencies": {
    "@testing-library/react": "^16.3.0",
    "@testing-library/dom": "^15.1.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/user-event": "^14.6.1",
    "axios-mock-adapter": "^2.1.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  }
}
```

---

## Summary

### Service Tests
- Use `InstanceType<typeof MockAdapter>` for typing
- Disable interceptors in test environment
- Apply MockAdapter to service's axios instance via `getAxiosInstance()`

### RTK Query Tests
- Test public API only (endpoints, hooks, store integration)
- Never access internal properties (`.query`, `.providesTags`, etc.)
- Use store-based testing patterns

### Component Tests
- Import `render` from `@testing-library/react`
- Import `screen`, `waitFor`, `fireEvent` from `@testing-library/dom`
- Enable `esModuleInterop` in Jest config
- Polyfill TextEncoder/TextDecoder

### Configuration
- Always enable `esModuleInterop` and `allowSyntheticDefaultImports`
- Set up TextEncoder polyfill
- Mock window.matchMedia and IntersectionObserver

---

**Document Version:** 1.0
**Last Updated:** 2025-10-09
**Story:** 2.6 - Fix Frontend Test Infrastructure
