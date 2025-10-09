# Database Schema

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
