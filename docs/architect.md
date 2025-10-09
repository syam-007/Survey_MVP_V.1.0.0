illilla# Survey Management System Fullstack Architecture Document

## Introduction

This document outlines the complete fullstack architecture for **Survey Management System**, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

### Starter Template or Existing Project
**N/A - Greenfield project** - This is a new development project without existing codebase dependencies.

### Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2024-12-19 | 1.0 | Initial architecture document | Winston (Architect) |

## High Level Architecture

### Technical Summary

The Survey Management System is a modern web application built with Django REST Framework backend and React frontend, designed for managing well survey data with advanced calculations using the welleng library. The system follows a traditional three-tier architecture with PostgreSQL database, deployed on AWS infrastructure. The frontend provides rich 2D/3D visualization capabilities using Plotly.js, while the backend handles complex survey calculations, file processing, and report generation. The architecture emphasizes security, performance, and scalability to support engineering workflows with large datasets.

### Platform and Infrastructure Choice

**Platform:** AWS (Amazon Web Services)
**Key Services:** EC2, RDS PostgreSQL, S3, CloudFront, IAM, CloudWatch
**Deployment Host and Regions:** us-east-1 (primary), us-west-2 (backup)

### Repository Structure

**Structure:** Monorepo with separate frontend and backend applications
**Monorepo Tool:** npm workspaces
**Package Organization:** apps/ (web, api), packages/ (shared, ui, config)

### High Level Architecture Diagram

```mermaid
graph TB
    User[User Browser] --> CF[CloudFront CDN]
    CF --> ALB[Application Load Balancer]
    ALB --> WebApp[React Web App]
    ALB --> API[Django API Server]
    
    API --> DB[(PostgreSQL RDS)]
    API --> S3[S3 File Storage]
    API --> Welleng[Welleng Library]
    
    WebApp --> Plotly[Plotly.js 3D Visualization]
    WebApp --> API
    
    subgraph "AWS Infrastructure"
        CF
        ALB
        WebApp
        API
        DB
        S3
    end
    
    subgraph "External Services"
        Welleng
        Plotly
    end
```

### Architectural Patterns

- **Traditional Three-Tier Architecture:** Clear separation between presentation, business logic, and data layers - _Rationale:_ Provides clear boundaries and scalability for enterprise applications with complex business logic
- **RESTful API Design:** Standard HTTP methods and status codes for API communication - _Rationale:_ Industry standard approach with excellent tooling and documentation support for scientific computing workflows
- **Component-Based Frontend:** Reusable React components with TypeScript - _Rationale:_ Maintainability and type safety across large codebases with complex visualization requirements
- **Repository Pattern:** Abstract data access logic in backend - _Rationale:_ Enables testing and future database migration flexibility for survey data models
- **File-Based Processing:** Asynchronous file upload and processing workflow - _Rationale:_ Handles large survey files efficiently without blocking user interface during calculations
- **Event-Driven Updates:** Real-time status updates for long-running calculations - _Rationale:_ Provides user feedback during complex welleng library processing operations

## Tech Stack

### Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.3+ | Type-safe frontend development | Enhanced developer experience and reduced runtime errors for complex survey data handling |
| Frontend Framework | React | 18.2+ | Component-based UI development | Mature ecosystem with excellent 3D visualization support via Plotly.js integration |
| UI Component Library | Material-UI | 5.14+ | Consistent design system | Professional appearance with comprehensive component library for enterprise users |
| State Management | Redux Toolkit | 1.9+ | Predictable state management | Handles complex survey data and calculation states with time-travel debugging |
| Backend Language | Python | 3.11+ | Scientific computing and data processing | Essential for welleng library integration and numerical calculations |
| Backend Framework | Django REST Framework | 3.14+ | Rapid API development | Built-in admin, ORM, and security features for survey data management |
| API Style | REST | - | Standard HTTP API | Simple integration with frontend and external tools, excellent tooling support |
| Database | PostgreSQL | 15+ | Relational data storage | ACID compliance and excellent performance for survey data with complex relationships |
| Cache | Redis | 7.0+ | Session storage and caching | Fast in-memory storage for calculation results and user sessions |
| File Storage | AWS S3 | - | Survey file storage | Scalable and secure file storage with versioning for uploaded survey files |
| Authentication | Django Auth + JWT | - | User authentication | Secure token-based authentication with role management (Admin, Engineer, Viewer) |
| Frontend Testing | Jest + React Testing Library | 29+ | Component and unit testing | Comprehensive testing ecosystem for React applications with survey components |
| Backend Testing | pytest + Django TestCase | 7.4+ | API and unit testing | Python testing standard with Django integration for survey calculation testing |
| E2E Testing | Playwright | 1.40+ | End-to-end testing | Cross-browser testing with excellent debugging tools for survey workflows |
| Build Tool | npm | 9+ | Package management | Standard Node.js package manager for monorepo workspace management |
| Bundler | Vite | 5.0+ | Fast development and building | Excellent development experience with hot reload for React development |
| IaC Tool | Terraform | 1.6+ | Infrastructure as code | Declarative infrastructure management for AWS resources |
| CI/CD | GitHub Actions | - | Automated testing and deployment | Integrated with GitHub repository for survey system CI/CD |
| Monitoring | AWS CloudWatch | - | Application monitoring | Native AWS monitoring and alerting for production survey system |
| Logging | Django Logging + CloudWatch | - | Application logging | Centralized logging with AWS integration for survey processing logs |
| CSS Framework | Material-UI + CSS Modules | - | Styling and theming | Component-based styling with theme support for professional appearance |

## Data Models

### Run
**Purpose:** Represents a survey run with associated metadata and configuration

**Key Attributes:**
- id: UUID - Primary key identifier
- run_number: string - Unique run identifier
- run_name: string - Human-readable run name
- run_type: enum - Type of survey run
- vertical_section: object - Vertical section information
- bhc_enabled: boolean - Bottom Hole Closure flag
- proposal_direction: float - Calculated proposal direction
- grid_correction: float - Grid correction value
- created_at: datetime - Creation timestamp
- updated_at: datetime - Last update timestamp

#### TypeScript Interface
```typescript
interface Run {
  id: string;
  run_number: string;
  run_name: string;
  run_type: 'GTL' | 'Gyro' | 'MWD' | 'Unknown';
  vertical_section: VerticalSection;
  bhc_enabled: boolean;
  proposal_direction: number;
  grid_correction: number;
  created_at: string;
  updated_at: string;
  well?: Well;
  location?: Location;
  depth?: Depth;
  survey_info?: SurveyInfo;
  survey_files: SurveyFile[];
}
```

#### Relationships
- Belongs to Well (optional)
- Has one Location
- Has one Depth
- Has one SurveyInfo
- Has many SurveyFiles

### Well
**Purpose:** Represents a well with location and depth information

**Key Attributes:**
- id: UUID - Primary key identifier
- well_name: string - Well identifier
- well_type: enum - Type of well
- created_at: datetime - Creation timestamp

#### TypeScript Interface
```typescript
interface Well {
  id: string;
  well_name: string;
  well_type: string;
  created_at: string;
  updated_at: string;
  location?: Location;
  depth?: Depth;
  runs: Run[];
}
```

#### Relationships
- Has many Runs
- Has one Location
- Has one Depth

### SurveyFile
**Purpose:** Represents uploaded survey data files with processing status

**Key Attributes:**
- id: UUID - Primary key identifier
- file_name: string - Original filename
- file_path: string - S3 storage path
- file_size: integer - File size in bytes
- survey_type: enum - Type of survey data
- processing_status: enum - Current processing state
- calculated_data: json - Processed survey results
- created_at: datetime - Upload timestamp

#### TypeScript Interface
```typescript
interface SurveyFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  survey_type: 'GTL' | 'Gyro' | 'MWD' | 'Unknown';
  processing_status: 'uploaded' | 'processing' | 'completed' | 'failed';
  calculated_data: SurveyData;
  created_at: string;
  run: Run;
  calculations: SurveyCalculation[];
}
```

#### Relationships
- Belongs to Run
- Has many SurveyCalculations

## API Specification

### REST API Specification

```yaml
openapi: 3.0.0
info:
  title: Survey Management System API
  version: 1.0.0
  description: API for managing well survey data and calculations
servers:
  - url: https://api.surveysystem.com/v1
    description: Production server
  - url: https://staging-api.surveysystem.com/v1
    description: Staging server

paths:
  /runs:
    get:
      summary: List all runs
      responses:
        '200':
          description: List of runs
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Run'
    post:
      summary: Create a new run
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateRunRequest'
      responses:
        '201':
          description: Run created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Run'

  /runs/{run_id}/upload:
    post:
      summary: Upload survey file
      parameters:
        - name: run_id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                survey_type:
                  type: string
                  enum: [GTL, Gyro, MWD, Unknown]
      responses:
        '201':
          description: File uploaded and processing started
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SurveyFile'

  /runs/{run_id}/calculate:
    post:
      summary: Calculate survey data
      parameters:
        - name: run_id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Calculation completed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CalculationResult'

components:
  schemas:
    Run:
      type: object
      properties:
        id:
          type: string
          format: uuid
        run_number:
          type: string
        run_name:
          type: string
        run_type:
          type: string
          enum: [GTL, Gyro, MWD, Unknown]
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    CreateRunRequest:
      type: object
      required:
        - run_number
        - run_name
        - run_type
      properties:
        run_number:
          type: string
        run_name:
          type: string
        run_type:
          type: string
          enum: [GTL, Gyro, MWD, Unknown]
        well_id:
          type: string
          format: uuid
```

## Components

### Frontend Web Application
**Responsibility:** User interface for survey management, data visualization, and report generation

**Key Interfaces:**
- React Router for navigation and protected routes
- Redux store for state management and calculation status
- Axios HTTP client for API communication
- Plotly.js for 2D/3D survey visualization
- Material-UI components for consistent UI

**Dependencies:** Backend API, AWS S3 for file downloads, Plotly.js CDN

**Technology Stack:** React 18.2, TypeScript, Material-UI, Redux Toolkit, Vite

### Django API Server
**Responsibility:** Business logic, data processing, file handling, and API endpoints

**Key Interfaces:**
- Django REST Framework API endpoints
- Welleng library integration for survey calculations
- AWS S3 file operations and storage
- PostgreSQL database access via Django ORM
- JWT authentication and authorization

**Dependencies:** PostgreSQL, Redis, AWS S3, Welleng library, Celery for async tasks

**Technology Stack:** Django 4.2+, Python 3.11+, DRF 3.14+, PostgreSQL 15+, Redis 7.0+

### Survey Calculation Engine
**Responsibility:** Process survey data using welleng library and generate results

**Key Interfaces:**
- Welleng library API for survey calculations
- File processing pipeline for Excel/CSV data
- Calculation result storage and caching
- Real-time status updates for long-running operations

**Dependencies:** Welleng library, SurveyFile data, Redis for caching, Celery workers

**Technology Stack:** Python 3.11+, Welleng, NumPy, Pandas, Celery

### File Processing Service
**Responsibility:** Handle file uploads, validation, and storage

**Key Interfaces:**
- AWS S3 integration for file storage
- File validation logic for survey data formats
- Processing status updates and error handling
- File metadata management

**Dependencies:** AWS S3, Django models, File validation libraries

**Technology Stack:** Django, boto3, pandas, openpyxl

### Component Diagrams

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React Components]
        State[Redux Store]
        Router[React Router]
        Charts[Plotly.js Charts]
    end
    
    subgraph "API Layer"
        API[Django REST API]
        Auth[JWT Authentication]
        Validation[Input Validation]
    end
    
    subgraph "Business Logic"
        Calc[Survey Calculator]
        File[File Processor]
        Report[Report Generator]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL)]
        Cache[(Redis)]
        Storage[(S3)]
    end
    
    UI --> API
    State --> API
    API --> Auth
    API --> Validation
    API --> Calc
    API --> File
    API --> Report
    Calc --> DB
    File --> Storage
    Report --> Cache
```

## External APIs

### Welleng Library API
- **Purpose:** Survey calculation and analysis functions
- **Documentation:** https://github.com/pro-wellplan/welleng
- **Base URL(s):** Python package import
- **Authentication:** N/A (Python library)
- **Rate Limits:** N/A

**Key Endpoints Used:**
- `welleng.survey.Survey` - Main survey calculation class
- `welleng.survey.interpolate_survey` - Survey interpolation
- `welleng.survey.get_survey` - Survey data processing

**Integration Notes:** Direct Python library integration with error handling for calculation failures

## Core Workflows

### Survey Upload and Calculation Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant FP as File Processor
    participant SC as Survey Calculator
    participant S3 as AWS S3
    participant DB as Database
    
    U->>F: Upload survey file
    F->>A: POST /runs/{id}/upload
    A->>FP: Process file upload
    FP->>S3: Store file
    FP->>DB: Save file metadata
    A->>F: Return file ID
    
    F->>A: POST /runs/{id}/calculate
    A->>SC: Start calculation
    SC->>S3: Read survey data
    SC->>SC: Process with welleng
    SC->>DB: Save results
    A->>F: Return calculation status
    
    F->>A: GET /runs/{id}/results
    A->>DB: Fetch results
    A->>F: Return survey data
    F->>U: Display 2D/3D charts
```

## Database Schema

```sql
-- Core tables
CREATE TABLE wells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    well_name VARCHAR(255) NOT NULL,
    well_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_number VARCHAR(100) NOT NULL UNIQUE,
    run_name VARCHAR(255) NOT NULL UNIQUE,
    run_type VARCHAR(50) NOT NULL,
    vertical_section JSONB,
    bhc_enabled BOOLEAN DEFAULT FALSE,
    proposal_direction DECIMAL(10,6),
    grid_correction DECIMAL(10,6) DEFAULT 0,
    well_id UUID REFERENCES wells(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    easting DECIMAL(12,3),
    northing DECIMAL(12,3),
    geodetic_system VARCHAR(100),
    map_zone VARCHAR(50),
    north_reference VARCHAR(50),
    central_meridian DECIMAL(8,3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE depths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
    elevation_reference VARCHAR(100),
    reference_datum VARCHAR(100),
    reference_height DECIMAL(10,3),
    reference_elevation DECIMAL(10,3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE survey_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    survey_type VARCHAR(50) NOT NULL,
    processing_status VARCHAR(50) DEFAULT 'uploaded',
    calculated_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE survey_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_file_id UUID REFERENCES survey_files(id) ON DELETE CASCADE,
    calculation_type VARCHAR(100) NOT NULL,
    parameters JSONB,
    results JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_runs_well_id ON runs(well_id);
CREATE INDEX idx_survey_files_run_id ON survey_files(run_id);
CREATE INDEX idx_survey_calculations_file_id ON survey_calculations(survey_file_id);
CREATE INDEX idx_survey_files_status ON survey_files(processing_status);
```

## Frontend Architecture

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

## Backend Architecture

### Service Architecture

#### Controller Organization
```
api/
├── views/
│   ├── runs.py            # Run management endpoints
│   ├── surveys.py         # Survey processing endpoints
│   ├── files.py           # File upload endpoints
│   └── reports.py         # Report generation endpoints
├── serializers/
│   ├── run_serializers.py
│   ├── survey_serializers.py
│   └── file_serializers.py
├── services/
│   ├── survey_calculator.py
│   ├── file_processor.py
│   └── report_generator.py
├── models/
│   ├── run.py
│   ├── survey.py
│   └── file.py
└── utils/
    ├── validators.py
    └── helpers.py
```

#### Controller Template
```python
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import RunSerializer
from .services import RunService

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def runs_view(request):
    if request.method == 'GET':
        runs = RunService.get_user_runs(request.user)
        serializer = RunSerializer(runs, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = RunSerializer(data=request.data)
        if serializer.is_valid():
            run = RunService.create_run(serializer.validated_data, request.user)
            return Response(RunSerializer(run).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

### Database Architecture

#### Schema Design
```python
from django.db import models
from django.contrib.auth.models import User
import uuid

class Well(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    well_name = models.CharField(max_length=255, unique=True)
    well_type = models.CharField(max_length=50, choices=[
        ('Oil', 'Oil'),
        ('Gas', 'Gas'),
        ('Water', 'Water'),
        ('Other', 'Other'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'wells'

class Run(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run_number = models.CharField(max_length=100, unique=True)
    run_name = models.CharField(max_length=255, unique=True)
    run_type = models.CharField(max_length=50, choices=[
        ('GTL', 'GTL'),
        ('Gyro', 'Gyro'),
        ('MWD', 'MWD'),
        ('Unknown', 'Unknown'),
    ])
    well = models.ForeignKey(Well, on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'runs'
```

#### Data Access Layer
```python
from django.db import models
from typing import List, Optional
from .models import Run, SurveyFile

class RunRepository:
    @staticmethod
    def get_user_runs(user) -> List[Run]:
        return Run.objects.filter(user=user).select_related('well')
    
    @staticmethod
    def get_run_by_id(run_id: str, user) -> Optional[Run]:
        try:
            return Run.objects.get(id=run_id, user=user)
        except Run.DoesNotExist:
            return None
    
    @staticmethod
    def create_run(data: dict, user) -> Run:
        return Run.objects.create(user=user, **data)

class SurveyFileRepository:
    @staticmethod
    def get_run_files(run_id: str) -> List[SurveyFile]:
        return SurveyFile.objects.filter(run_id=run_id)
    
    @staticmethod
    def create_survey_file(data: dict) -> SurveyFile:
        return SurveyFile.objects.create(**data)
```

### Authentication and Authorization

#### Auth Flow
```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant DB as Database
    
    C->>A: POST /auth/login (credentials)
    A->>DB: Validate credentials
    DB->>A: User data
    A->>A: Generate JWT token
    A->>C: Return JWT token
    
    C->>A: API request with JWT
    A->>A: Validate JWT token
    A->>A: Check user permissions
    A->>C: Return response
```

#### Middleware/Guards
```python
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import BasePermission

class IsOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return obj.user == request.user

class SurveyPermission(BasePermission):
    def has_permission(self, request, view):
        if request.user.role in ['Admin', 'Engineer', 'Surveyor']:
            return True
        return False
```

## Unified Project Structure

```
survey-management-system/
├── .github/                    # CI/CD workflows
│   └── workflows/
│       ├── ci.yaml
│       └── deploy.yaml
├── apps/                       # Application packages
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   │   ├── common/
│   │   │   │   ├── forms/
│   │   │   │   ├── charts/
│   │   │   │   └── layout/
│   │   │   ├── pages/          # Page components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── services/       # API client services
│   │   │   ├── stores/         # Redux store slices
│   │   │   ├── types/          # TypeScript interfaces
│   │   │   ├── utils/          # Frontend utilities
│   │   │   └── App.tsx
│   │   ├── public/             # Static assets
│   │   ├── tests/              # Frontend tests
│   │   └── package.json
│   └── api/                    # Django backend
│       ├── survey_api/
│       │   ├── views/          # API endpoints
│       │   ├── serializers/    # DRF serializers
│       │   ├── services/       # Business logic
│       │   ├── models/         # Django models
│       │   ├── utils/          # Backend utilities
│       │   └── urls.py
│       ├── manage.py
│       ├── requirements.txt
│       └── settings/
│           ├── base.py
│           ├── development.py
│           └── production.py
├── packages/                   # Shared packages
│   ├── shared/                 # Shared types/utilities
│   │   ├── src/
│   │   │   ├── types/          # TypeScript interfaces
│   │   │   ├── constants/      # Shared constants
│   │   │   └── utils/          # Shared utilities
│   │   └── package.json
│   ├── ui/                     # Shared UI components
│   │   ├── src/
│   │   └── package.json
│   └── config/                 # Shared configuration
│       ├── eslint/
│       ├── typescript/
│       └── jest/
├── infrastructure/             # Terraform definitions
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── scripts/                    # Build/deploy scripts
├── docs/                       # Documentation
│   ├── prd.md
│   ├── architecture.md
│   └── api/
├── .env.example                # Environment template
├── package.json                # Root package.json
├── docker-compose.yml          # Local development
└── README.md
```

## Development Workflow

### Local Development Setup

#### Prerequisites
```bash
# Required software
node --version  # v18+
python --version  # v3.11+
docker --version  # v20+
docker-compose --version  # v2+
```

#### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd survey-management-system

# Install dependencies
npm install

# Setup Python environment
cd apps/api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Setup database
docker-compose up -d postgres redis
python manage.py migrate
python manage.py createsuperuser

# Start development servers
npm run dev
```

#### Development Commands
```bash
# Start all services
npm run dev

# Start frontend only
npm run dev:web

# Start backend only
npm run dev:api

# Run tests
npm run test
npm run test:api
npm run test:e2e
```

### Environment Configuration

#### Required Environment Variables
```bash
# Frontend (.env.local)
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_ENVIRONMENT=development

# Backend (.env)
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/survey_db
REDIS_URL=redis://localhost:6379/0
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=survey-files

# Shared
NODE_ENV=development
```

## Deployment Architecture

### Deployment Strategy
**Frontend Deployment:**
- **Platform:** AWS S3 + CloudFront
- **Build Command:** `npm run build`
- **Output Directory:** `dist/`
- **CDN/Edge:** CloudFront distribution

**Backend Deployment:**
- **Platform:** AWS EC2 with Application Load Balancer
- **Build Command:** `pip install -r requirements.txt`
- **Deployment Method:** Docker containers with ECS

### CI/CD Pipeline
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run frontend tests
        run: npm run test
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Run backend tests
        run: |
          cd apps/api
          pip install -r requirements.txt
          python manage.py test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to AWS
        run: |
          # Deployment steps
          terraform apply -auto-approve
```

### Environments
| Environment | Frontend URL | Backend URL | Purpose |
|-------------|--------------|-------------|---------|
| Development | http://localhost:3000 | http://localhost:8000 | Local development |
| Staging | https://staging.surveysystem.com | https://staging-api.surveysystem.com | Pre-production testing |
| Production | https://surveysystem.com | https://api.surveysystem.com | Live environment |

## Security and Performance

### Security Requirements
**Frontend Security:**
- CSP Headers: `default-src 'self'; script-src 'self' 'unsafe-inline'`
- XSS Prevention: React's built-in XSS protection, input sanitization
- Secure Storage: JWT tokens in httpOnly cookies

**Backend Security:**
- Input Validation: Django forms and serializers validation
- Rate Limiting: 100 requests per minute per user
- CORS Policy: Restricted to frontend domains only

**Authentication Security:**
- Token Storage: JWT in httpOnly cookies with 24h expiration
- Session Management: Automatic refresh tokens
- Password Policy: Minimum 8 characters, mixed case, numbers

### Performance Optimization
**Frontend Performance:**
- Bundle Size Target: < 2MB initial bundle
- Loading Strategy: Code splitting with React.lazy
- Caching Strategy: Service worker with cache-first strategy

**Backend Performance:**
- Response Time Target: < 500ms for API calls
- Database Optimization: Proper indexing, query optimization
- Caching Strategy: Redis for calculation results, 1 hour TTL

## Testing Strategy

### Testing Pyramid
```
E2E Tests
/        \
Integration Tests
/            \
Frontend Unit  Backend Unit
```

### Test Organization
**Frontend Tests**
```
apps/web/tests/
├── components/        # Component unit tests
├── pages/            # Page integration tests
├── services/         # API service tests
└── utils/            # Utility function tests
```

**Backend Tests**
```
apps/api/tests/
├── test_views.py     # API endpoint tests
├── test_models.py    # Model tests
├── test_services.py  # Business logic tests
└── test_utils.py     # Utility tests
```

**E2E Tests**
```
tests/e2e/
├── auth.spec.ts      # Authentication flows
├── survey.spec.ts    # Survey management flows
└── reports.spec.ts   # Report generation flows
```

### Test Examples

#### Frontend Component Test
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { RunForm } from '../RunForm';

describe('RunForm', () => {
  it('should submit form with valid data', async () => {
    const onSubmit = jest.fn();
    render(<RunForm onSubmit={onSubmit} />);
    
    fireEvent.change(screen.getByLabelText('Run Name'), {
      target: { value: 'Test Run' }
    });
    fireEvent.click(screen.getByText('Create Run'));
    
    expect(onSubmit).toHaveBeenCalledWith({
      run_name: 'Test Run',
      run_type: 'GTL'
    });
  });
});
```

#### Backend API Test
```python
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User

class RunAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_create_run(self):
        data = {
            'run_number': 'RUN001',
            'run_name': 'Test Run',
            'run_type': 'GTL'
        }
        response = self.client.post(reverse('runs-list'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['run_name'], 'Test Run')
```

#### E2E Test
```typescript
import { test, expect } from '@playwright/test';

test('should create and process survey run', async ({ page }) => {
  await page.goto('/runs/new');
  
  await page.fill('[data-testid="run-name"]', 'E2E Test Run');
  await page.selectOption('[data-testid="run-type"]', 'GTL');
  await page.click('[data-testid="create-run"]');
  
  await expect(page).toHaveURL(/\/runs\/\w+/);
  await expect(page.locator('h1')).toContainText('E2E Test Run');
  
  await page.setInputFiles('[data-testid="file-upload"]', 'test-data.xlsx');
  await page.click('[data-testid="upload-file"]');
  
  await expect(page.locator('[data-testid="processing-status"]'))
    .toContainText('Processing');
});
```

## Coding Standards

### Critical Fullstack Rules
- **Type Sharing:** Always define types in packages/shared and import from there
- **API Calls:** Never make direct HTTP calls - use the service layer
- **Environment Variables:** Access only through config objects, never process.env directly
- **Error Handling:** All API routes must use the standard error handler
- **State Updates:** Never mutate state directly - use proper state management patterns
- **File Uploads:** Always validate file types and sizes before processing
- **Authentication:** All protected routes must check user permissions
- **Database Queries:** Use select_related and prefetch_related for optimization

### Naming Conventions
| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `UserProfile.tsx` |
| Hooks | camelCase with 'use' | - | `useAuth.ts` |
| API Routes | - | kebab-case | `/api/user-profile` |
| Database Tables | - | snake_case | `user_profiles` |

## Error Handling Strategy

### Error Flow
```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as API
    participant S as Service
    participant DB as Database
    
    F->>A: API Request
    A->>S: Service Call
    S->>DB: Database Query
    DB-->>S: Error
    S-->>A: Service Error
    A->>A: Format Error Response
    A-->>F: HTTP Error Response
    F->>F: Display User Message
```

### Error Response Format
```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
}
```

### Frontend Error Handling
```typescript
import { toast } from 'react-toastify';

export const handleApiError = (error: any) => {
  if (error.response?.data?.error) {
    const { code, message } = error.response.data.error;
    toast.error(`${code}: ${message}`);
  } else {
    toast.error('An unexpected error occurred');
  }
};
```

### Backend Error Handling
```python
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Invalid input data',
                'details': response.data,
                'timestamp': timezone.now().isoformat(),
                'requestId': context['request'].META.get('HTTP_X_REQUEST_ID')
            }
        }
        response.data = custom_response_data
    
    return response
```

## Monitoring and Observability

### Monitoring Stack
- **Frontend Monitoring:** Sentry for error tracking, Google Analytics for usage
- **Backend Monitoring:** AWS CloudWatch for metrics and logs
- **Error Tracking:** Sentry for both frontend and backend errors
- **Performance Monitoring:** AWS X-Ray for distributed tracing

### Key Metrics
**Frontend Metrics:**
- Core Web Vitals (LCP, FID, CLS)
- JavaScript errors and exceptions
- API response times
- User interactions and page views

**Backend Metrics:**
- Request rate and response times
- Error rate and types
- Database query performance
- File processing times
- Survey calculation performance

## Checklist Results Report

*This section will be populated after running the architect checklist to validate the architecture document completeness and quality.*

