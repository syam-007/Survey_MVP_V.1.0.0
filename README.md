# Survey Management System

A full-stack survey management application built with Django REST Framework backend and React frontend, designed for managing wellbore surveys and directional drilling data.

## Prerequisites

- **Node.js** 18+ and npm 9+
- **Python** 3.11+
- **PostgreSQL** 15+
- **Redis** 7.0+
- **Docker** and Docker Compose (for containerized development)

## Quick Start with Docker

The fastest way to get started is using Docker Compose:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd survey
   ```

2. **Copy environment variables**
   ```bash
   cp .env.example .env
   ```

3. **Start all services**
   ```bash
   docker-compose up
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - Django Admin: http://localhost:8000/admin

5. **Create Django superuser** (in a new terminal)
   ```bash
   docker-compose exec api python manage.py createsuperuser
   ```

## Manual Setup

### Backend Setup

1. **Navigate to the API directory**
   ```bash
   cd apps/api
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv

   # Windows
   .\venv\Scripts\activate

   # Unix/MacOS
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**

   Create a `.env` file in the root directory with:
   ```
   DATABASE_NAME=survey_db
   DATABASE_USER=survey_user
   DATABASE_PASSWORD=your_password
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   REDIS_URL=redis://localhost:6379/0
   SECRET_KEY=your_secret_key
   DEBUG=True
   ENVIRONMENT=development
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Start the development server**
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. **Navigate to the web directory**
   ```bash
   cd apps/web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
survey/
├── .github/workflows/          # CI/CD workflows
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── pages/          # Page components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── services/       # API services
│   │   │   ├── stores/         # Redux stores
│   │   │   ├── types/          # TypeScript types
│   │   │   └── utils/          # Utility functions
│   │   ├── tests/              # Frontend tests
│   │   └── package.json
│   └── api/                    # Django backend
│       ├── survey_api/
│       │   ├── views/          # API endpoints
│       │   ├── serializers/    # DRF serializers
│       │   ├── services/       # Business logic
│       │   ├── models/         # Django models
│       │   ├── utils/          # Helper functions
│       │   └── settings/       # Environment-specific settings
│       ├── tests/              # Backend tests
│       ├── manage.py
│       └── requirements.txt
├── packages/                   # Shared packages
│   ├── shared/                 # Shared types and utilities
│   ├── ui/                     # Shared UI components
│   └── config/                 # Shared configurations
├── infrastructure/             # Terraform definitions
├── scripts/                    # Build/deploy scripts
├── docs/                       # Documentation
├── .env.example                # Environment template
├── docker-compose.yml          # Docker services
├── package.json                # Root workspace config
└── README.md
```

## Development Workflow

### Monorepo Commands

From the root directory:

```bash
# Install all dependencies (frontend and backend)
npm run install:all

# Run frontend dev server
npm run dev:web

# Run backend dev server
npm run dev:api

# Run tests for all workspaces
npm test

# Build all workspaces
npm build
```

### Working with Docker

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild services after changes
docker-compose up --build

# Execute commands in running containers
docker-compose exec api python manage.py migrate
docker-compose exec web npm install <package>
```

### Database Management

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Access PostgreSQL shell
docker-compose exec postgres psql -U survey_user -d survey_db
```

## Technology Stack

### Frontend
- **React** 18.2+ - UI framework
- **TypeScript** 5.3+ - Type safety
- **Vite** 5.0+ - Build tool
- **Material-UI** 5.14+ - UI component library
- **Redux Toolkit** 1.9+ - State management
- **Jest** & **React Testing Library** - Testing

### Backend
- **Python** 3.11+
- **Django** 5.2+ - Web framework
- **Django REST Framework** 3.16+ - API framework
- **PostgreSQL** 15+ - Database
- **Redis** 7.0+ - Caching and sessions
- **pytest** - Testing framework

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Local development orchestration
- **npm workspaces** - Monorepo management

## Troubleshooting

### Port Already in Use

If you see errors about ports being in use:

```bash
# Check what's using the port (replace 5173 with the port number)
# Windows
netstat -ano | findstr :5173

# Unix/MacOS
lsof -i :5173

# Stop the conflicting process or change the port in docker-compose.yml
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Ensure database environment variables match in .env and docker-compose.yml
```

### Frontend Can't Connect to Backend

- Ensure `VITE_API_URL` in `.env` or docker-compose.yml points to `http://localhost:8000`
- Check CORS settings in `apps/api/survey_api/settings/development.py`
- Verify backend is running and accessible at http://localhost:8000

### Docker Build Failures

```bash
# Clear Docker cache and rebuild
docker-compose down
docker system prune -a
docker-compose up --build
```

### Hot Reload Not Working

- For frontend: Ensure `vite.config.ts` has `server.host: true`
- For backend: Verify volume mounts in docker-compose.yml
- Restart the affected service: `docker-compose restart web` or `docker-compose restart api`

## Testing

### Frontend Tests
```bash
cd apps/web
npm test
```

### Backend Tests
```bash
cd apps/api
pytest
```

## Contributing

Please refer to the project documentation in the `docs/` directory for:
- Architecture decisions
- Coding standards
- Development workflow
- Story-driven development process

## License

[Your License Here]
