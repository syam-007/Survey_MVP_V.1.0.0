# Frontend Architecture

### Component Architecture

#### Component Organization
```
src/
├── components/
│   ├── common/           # Reusable UI components
│   ├── forms/            # Form components
│   ├── charts/           # Visualization components
│   └── layout/           # Layout components
├── pages/                # Page components
├── hooks/                # Custom React hooks
├── services/             # API client services
├── stores/               # Redux store slices
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

#### Component Template
```typescript
import React from 'react';
import { Box, Typography } from '@mui/material';

interface ComponentProps {
  title: string;
  children?: React.ReactNode;
}

export const Component: React.FC<ComponentProps> = ({ title, children }) => {
  return (
    <Box>
      <Typography variant="h6">{title}</Typography>
      {children}
    </Box>
  );
};
```

### State Management Architecture

#### State Structure
```typescript
interface RootState {
  auth: AuthState;
  runs: RunsState;
  surveys: SurveysState;
  ui: UIState;
}

interface RunsState {
  runs: Run[];
  currentRun: Run | null;
  loading: boolean;
  error: string | null;
}

interface SurveysState {
  files: SurveyFile[];
  calculations: SurveyCalculation[];
  currentCalculation: SurveyCalculation | null;
  loading: boolean;
  error: string | null;
}
```

#### State Management Patterns
- Redux Toolkit for predictable state updates
- RTK Query for API state management
- Normalized state structure for complex data
- Optimistic updates for better UX

### Routing Architecture

#### Route Organization
```
/                           # Dashboard
/runs                       # Runs list
/runs/new                   # Create new run
/runs/:id                   # Run details
/runs/:id/upload            # Upload survey file
/runs/:id/calculate         # Survey calculation
/runs/:id/compare           # Survey comparison
/runs/:id/adjust            # Survey adjustment
/runs/:id/extrapolate       # Survey extrapolation
/reports                    # Reports list
/settings                   # User settings
```

#### Protected Route Pattern
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
};
```

### Frontend Services Layer

#### API Client Setup
```typescript
import axios from 'axios';
import { store } from '../stores/store';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

#### Service Example
```typescript
import apiClient from './apiClient';
import { Run, CreateRunRequest } from '../types';

export const runsService = {
  async getRuns(): Promise<Run[]> {
    const response = await apiClient.get('/runs');
    return response.data;
  },
  
  async createRun(data: CreateRunRequest): Promise<Run> {
    const response = await apiClient.post('/runs', data);
    return response.data;
  },
  
  async uploadSurveyFile(runId: string, file: File, surveyType: string): Promise<SurveyFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('survey_type', surveyType);
    
    const response = await apiClient.post(`/runs/${runId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};
```
