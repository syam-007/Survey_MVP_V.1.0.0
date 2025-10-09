# Development Workflow

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
