# Testing Strategy

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
