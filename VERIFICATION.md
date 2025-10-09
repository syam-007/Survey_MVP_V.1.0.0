# Story 1.1 Verification Checklist

This document provides step-by-step instructions for verifying that Story 1.1 (Project Scaffolding & Monorepo Setup) has been completed successfully.

## Prerequisites

Before running verification, ensure:
- [ ] Docker Desktop is installed and running
- [ ] Node.js 18+ is installed
- [ ] Python 3.11+ is installed

## Verification Steps

### 1. Verify File Structure

Check that all directories and files exist:

```bash
# Root files
ls package.json
ls .gitignore
ls .env.example
ls README.md
ls docker-compose.yml

# Frontend structure
ls apps/web/package.json
ls apps/web/vite.config.ts
ls apps/web/Dockerfile
ls apps/web/src/components/
ls apps/web/src/pages/
ls apps/web/src/hooks/
ls apps/web/src/services/
ls apps/web/src/stores/
ls apps/web/src/types/
ls apps/web/src/utils/
ls apps/web/tests/

# Backend structure
ls apps/api/requirements.txt
ls apps/api/Dockerfile
ls apps/api/manage.py
ls apps/api/survey_api/settings/base.py
ls apps/api/survey_api/settings/development.py
ls apps/api/survey_api/settings/production.py
ls apps/api/survey_api/views/
ls apps/api/survey_api/serializers/
ls apps/api/survey_api/services/
ls apps/api/survey_api/models/
ls apps/api/survey_api/utils/
ls apps/api/tests/

# Shared packages
ls packages/shared/package.json
ls packages/ui/package.json
ls packages/config/package.json
```

### 2. Create Environment File

```bash
# Copy the example environment file
cp .env.example .env
```

### 3. Start Docker Services

```bash
# Start all services in detached mode
docker-compose up -d

# Expected output:
# - Creating network "survey_default"
# - Creating survey-postgres
# - Creating survey-redis
# - Creating survey-api
# - Creating survey-web
```

### 4. Verify Service Health

```bash
# Check that all containers are running
docker-compose ps

# Expected output: All services should show "Up" status
# NAME             STATUS          PORTS
# survey-postgres  Up (healthy)    0.0.0.0:5432->5432/tcp
# survey-redis     Up (healthy)    0.0.0.0:6379->6379/tcp
# survey-api       Up              0.0.0.0:8000->8000/tcp
# survey-web       Up              0.0.0.0:5173->5173/tcp

# View logs to ensure no errors
docker-compose logs
```

### 5. Verify PostgreSQL Connection

```bash
# Check PostgreSQL is accessible
docker-compose exec postgres psql -U survey_user -d survey_db -c "\conninfo"

# Expected output:
# You are connected to database "survey_db" as user "survey_user" via socket in "/var/run/postgresql" at port "5432".
```

### 6. Verify Redis Connection

```bash
# Check Redis is accessible
docker-compose exec redis redis-cli ping

# Expected output:
# PONG
```

### 7. Verify Django Backend

```bash
# Run Django migrations
docker-compose exec api python manage.py migrate

# Expected output:
# Operations to perform:
#   Apply all migrations: admin, auth, contenttypes, sessions
# Running migrations:
#   Applying contenttypes.0001_initial... OK
#   ...

# Check Django configuration
docker-compose exec api python manage.py check

# Expected output:
# System check identified no issues (0 silenced).

# Create Django superuser (interactive)
docker-compose exec api python manage.py createsuperuser
# Follow prompts to create admin user
```

### 8. Verify Backend API Accessibility

Open browser and navigate to:
- [ ] http://localhost:8000 - Should show Django welcome or API root
- [ ] http://localhost:8000/admin - Should show Django admin login page

### 9. Verify Frontend Accessibility

Open browser and navigate to:
- [ ] http://localhost:5173 - Should show React welcome page with Vite + React

### 10. Test Hot Reload - Frontend

```bash
# Edit apps/web/src/App.tsx
# Change the heading text and save
# Browser should automatically refresh and show changes
```

### 11. Test Hot Reload - Backend

```bash
# Edit apps/api/survey_api/urls.py
# Add a test endpoint and save
# Docker logs should show Django reloading
docker-compose logs -f api
```

### 12. Verify npm Workspaces

```bash
# From root directory
npm run dev:web  # Should start frontend dev server
# Ctrl+C to stop

npm run dev:api  # Should show API is running in Docker
```

### 13. Verify Shared Packages

```bash
# Check packages are accessible
ls packages/shared/src/types/index.ts
ls packages/shared/src/constants/index.ts
ls packages/shared/src/utils/index.ts
ls packages/ui/src/index.ts
ls packages/config/eslint/index.js
ls packages/config/typescript/tsconfig.base.json
ls packages/config/jest/jest.config.js
```

### 14. Stop All Services

```bash
# Stop and remove containers
docker-compose down

# Expected output:
# Stopping survey-web ... done
# Stopping survey-api ... done
# Stopping survey-redis ... done
# Stopping survey-postgres ... done
# Removing survey-web ... done
# Removing survey-api ... done
# Removing survey-redis ... done
# Removing survey-postgres ... done
# Removing network survey_default
```

## Acceptance Criteria Verification

After completing all steps, verify the following acceptance criteria:

- [x] **AC1:** Monorepo structure created with `apps/web/` and `apps/api/`
- [x] **AC2:** npm workspaces configured in root `package.json`
- [x] **AC3:** React frontend initialized with TypeScript, Vite, and Material-UI
- [x] **AC4:** Django backend initialized with virtual environment and Django REST Framework
- [x] **AC5:** PostgreSQL database configured and accessible
- [x] **AC6:** Redis configured for caching and sessions
- [x] **AC7:** Docker Compose file created for local development with all services
- [x] **AC8:** `.env.example` created with all required environment variables
- [x] **AC9:** README.md with quickstart instructions for local development
- [ ] **AC10:** All services start successfully with `docker-compose up` (manual verification required)

## Common Issues and Solutions

### Issue: Docker containers fail to start
**Solution:** Ensure Docker Desktop is running and has sufficient resources allocated (at least 4GB RAM, 2 CPUs)

### Issue: Port already in use
**Solution:** Check if services are already running on ports 5173, 8000, 5432, or 6379:
```bash
# Windows
netstat -ano | findstr :5173
netstat -ano | findstr :8000
netstat -ano | findstr :5432
netstat -ano | findstr :6379

# Stop the conflicting process or change ports in docker-compose.yml
```

### Issue: PostgreSQL healthcheck fails
**Solution:** Wait longer for PostgreSQL to initialize (first startup takes ~10-15 seconds)
```bash
docker-compose logs postgres
```

### Issue: Django migrations fail
**Solution:** Ensure PostgreSQL is healthy before running migrations:
```bash
docker-compose ps
# Wait until postgres shows "healthy" status
```

### Issue: Frontend can't connect to backend
**Solution:**
1. Verify CORS settings in `apps/api/survey_api/settings/development.py`
2. Check `VITE_API_URL` is set to `http://localhost:8000` in docker-compose.yml
3. Ensure backend is accessible: `curl http://localhost:8000`

## Success Criteria

✅ Story 1.1 is complete when:
1. All verification steps pass without errors
2. All 10 acceptance criteria are met
3. Frontend loads at http://localhost:5173
4. Backend loads at http://localhost:8000
5. Django admin is accessible at http://localhost:8000/admin
6. Hot reload works for both frontend and backend
7. All Docker services can be started and stopped cleanly

## Next Steps

After verification is complete:
- Mark Story 1.1 as "Complete" in the story file
- Proceed to Story 1.2: Authentication System
- Commit all changes to version control
