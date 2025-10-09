# API Specification

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
