# Unified Project Structure

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
