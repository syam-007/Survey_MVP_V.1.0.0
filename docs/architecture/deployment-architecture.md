# Deployment Architecture

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
