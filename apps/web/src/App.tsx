import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './stores/store';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { UsersPage } from './pages/UsersPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { RoleProtectedRoute } from './components/common/RoleProtectedRoute';
import { RunListPage } from './pages/runs/RunListPage';
import { CreateRunPage } from './pages/runs/CreateRunPage';
import { CreateCompleteRunPage } from './pages/runs/CreateCompleteRunPage';
import { RunDetailPage } from './pages/runs/RunDetailPage';
import { EditRunPage } from './pages/runs/EditRunPage';
import { SurveyResultsPage } from './pages/runs/SurveyResultsPage';
import { QAReviewPage } from './pages/runs/QAReviewPage';
import { ComparisonPage } from './pages/runs/ComparisonPage';
import { ComparisonDetailPage } from './pages/runs/ComparisonDetailPage';
import { AdjustmentPage } from './pages/runs/AdjustmentPage';
import { AdjustmentDetailPage } from './pages/runs/AdjustmentDetailPage';
import { ExtrapolationPage } from './pages/runs/ExtrapolationPage';
import { DuplicateSurveyPage } from './pages/runs/DuplicateSurveyPage';
import { WellListPage } from './pages/wells/WellListPage';
import { WellCreatePage } from './pages/wells/WellCreatePage';
import { WellDetailPage } from './pages/wells/WellDetailPage';
import { WellEditPage } from './pages/wells/WellEditPage';
import { JobListPage } from './pages/jobs/JobListPage';
import { JobCreatePage } from './pages/jobs/JobCreatePage';
import { JobDetailPage } from './pages/jobs/JobDetailPage';
import { JobComparisonPage } from './pages/jobs/JobComparisonPage';
import { JobAdjustmentPage } from './pages/jobs/JobAdjustmentPage';
import { ConfigurationPage } from './pages/ConfigurationPage';

// Material-UI theme configuration
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Create QueryClient instance with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1
    }
  }
});

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/jobs" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <RoleProtectedRoute requiredRole="Admin">
                  <UsersPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <JobListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/new"
              element={
                <RoleProtectedRoute requiredRole="Engineer">
                  <JobCreatePage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/jobs/:id"
              element={
                <ProtectedRoute>
                  <JobDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId/comparison"
              element={
                <ProtectedRoute>
                  <JobComparisonPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId/adjustment"
              element={
                <ProtectedRoute>
                  <JobAdjustmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuration"
              element={
                <ProtectedRoute>
                  <ConfigurationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/runs"
              element={
                <ProtectedRoute>
                  <RunListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/runs/new"
              element={
                <RoleProtectedRoute requiredRole="Engineer">
                  <CreateRunPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/runs/new/complete"
              element={
                <RoleProtectedRoute requiredRole="Engineer">
                  <CreateCompleteRunPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/runs/:id"
              element={
                <ProtectedRoute>
                  <RunDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/runs/:id/edit"
              element={
                <RoleProtectedRoute requiredRole="Engineer">
                  <EditRunPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/runs/:runId/qa-review"
              element={
                <ProtectedRoute>
                  <QAReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/runs/:runId/surveys/:surveyDataId"
              element={
                <ProtectedRoute>
                  <SurveyResultsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/runs/:id/comparison"
              element={
                <ProtectedRoute>
                  <ComparisonPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/runs/:id/adjustment"
              element={
                <ProtectedRoute>
                  <AdjustmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/runs/:id/adjustment/:comparisonId"
              element={
                <ProtectedRoute>
                  <AdjustmentDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/runs/:id/comparisons/:comparisonId"
              element={
                <ProtectedRoute>
                  <ComparisonDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/runs/:runId/extrapolation"
              element={
                <ProtectedRoute>
                  <ExtrapolationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/runs/:runId/extrapolation/:extrapolationId"
              element={
                <ProtectedRoute>
                  <ExtrapolationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/runs/:runId/duplicate-survey/new"
              element={
                <ProtectedRoute>
                  <DuplicateSurveyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wells"
              element={
                <ProtectedRoute>
                  <WellListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wells/new"
              element={
                <RoleProtectedRoute requiredRole="Engineer">
                  <WellCreatePage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/wells/:id"
              element={
                <ProtectedRoute>
                  <WellDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wells/:id/edit"
              element={
                <RoleProtectedRoute requiredRole="Engineer">
                  <WellEditPage />
                </RoleProtectedRoute>
              }
            />
          </Routes>
        </Router>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
