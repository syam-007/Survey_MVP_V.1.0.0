# Data Models

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
