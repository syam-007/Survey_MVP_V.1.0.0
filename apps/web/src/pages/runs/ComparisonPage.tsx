/**
 * ComparisonPage Component
 *
 * Main interface for survey comparison and delta analysis.
 * Based on Story 5.6: Comparison Frontend Workflow
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Button,
  Stack,
  Alert,
  AlertTitle,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  CompareArrows as CompareArrowsIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { SurveySelector } from '../../components/comparison/SurveySelector';
import { ComparisonControls } from '../../components/comparison/ComparisonControls';
import { ComparisonResults } from '../../components/comparison/ComparisonResults';
import { ComparisonHistoryList } from '../../components/comparison/ComparisonHistoryList';
import { ReferenceUploadDialog } from '../../components/comparison/ReferenceUploadDialog';
import { useGetRunByIdQuery } from '../../stores/runsSlice';
import { useCreateComparison } from '../../hooks/useComparison';

export const ComparisonPage: React.FC = () => {
  const { id: runId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Fetch run details
  const { data: run, isLoading: runLoading, error: runError, refetch } = useGetRunByIdQuery(runId!);

  // Comparison state
  const [primarySurveyId, setPrimarySurveyId] = useState<string>('');
  const [referenceSurveyId, setReferenceSurveyId] = useState<string>('');
  const [ratioFactor, setRatioFactor] = useState<number>(5);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [currentComparison, setCurrentComparison] = useState<any>(null);
  const [autoTriggerProcessed, setAutoTriggerProcessed] = useState(false);

  // Comparison mutation
  const { createComparison, isCreating, error: comparisonError, reset } = useCreateComparison();

  const handleCompare = async () => {
    if (!runId || !primarySurveyId || !referenceSurveyId) return;

    try {
      const result = await createComparison({
        run_id: runId,
        primary_survey_id: primarySurveyId,
        reference_survey_id: referenceSurveyId,
        ratio_factor: ratioFactor,
      });

      setCurrentComparison(result);
      reset();
    } catch (error) {
      console.error('Comparison failed:', error);
    }
  };

  // Handle URL parameters for auto-triggering comparison
  useEffect(() => {
    const primaryParam = searchParams.get('primary');
    const referenceParam = searchParams.get('reference');
    const autoParam = searchParams.get('auto');

    // Only auto-trigger once and when run data is loaded
    if (autoParam === 'true' && primaryParam && referenceParam && run && !autoTriggerProcessed) {
      setPrimarySurveyId(primaryParam);
      setReferenceSurveyId(referenceParam);
      setAutoTriggerProcessed(true);

      // Clean up URL parameters immediately
      setSearchParams({});
    }
  }, [searchParams, run, autoTriggerProcessed, setSearchParams]);

  // Auto-trigger comparison when state is set from URL parameters
  useEffect(() => {
    if (autoTriggerProcessed && primarySurveyId && referenceSurveyId && !currentComparison && !isCreating) {
      handleCompare();
    }
  }, [autoTriggerProcessed, primarySurveyId, referenceSurveyId]);

  const handleReset = () => {
    setCurrentComparison(null);
    setPrimarySurveyId('');
    setReferenceSurveyId('');
    setRatioFactor(10);
    reset();
  };

  const handleUploadSuccess = () => {
    refetch(); // Refresh run data to get updated survey files
    setUploadDialogOpen(false);
  };

  // Get completed surveys from run
  const completedSurveys = run?.survey_files?.filter(
    (file) => file.processing_status === 'completed' && file.survey_data_id
  ) || [];

  const primarySurveys = completedSurveys.filter((file) => file.survey_role === 'primary');
  const referenceSurveys = completedSurveys.filter((file) => file.survey_role === 'reference');

  if (runLoading) {
    return (
      <Container maxWidth="lg">
        <SkeletonLoader variant="detail" />
      </Container>
    );
  }

  if (runError || !run) {
    return (
      <Container maxWidth="lg">
        <ErrorAlert
          error={runError as Error}
          title="Failed to load run"
          onRetry={refetch}
        />
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/runs/${runId}`)}
          sx={{ mt: 2 }}
        >
          Back to Run
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <PageHeader
        title="Survey Comparison"
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Runs', path: '/runs' },
          { label: run.run_name, path: `/runs/${runId}` },
          { label: 'Comparison' },
        ]}
        actions={
          <Box display="flex" gap={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/runs/${runId}`)}
            >
              Back to Run
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Upload Reference Survey
            </Button>
          </Box>
        }
      />

      <Stack spacing={3}>
        {/* Info Banner */}
        <Alert severity="info">
          <AlertTitle>Survey Comparison & Delta Analysis</AlertTitle>
          Compare two surveys to calculate position and angular deltas. Select a primary survey and a
          reference survey, adjust the ratio factor, and click "Compare Surveys" to generate the
          comparison.
        </Alert>

        {/* Survey Selection and Controls */}
        {!currentComparison && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Surveys
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {primarySurveys.length === 0 || referenceSurveys.length === 0 ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <AlertTitle>Insufficient Surveys</AlertTitle>
                  You need at least one primary survey and one reference survey to perform a comparison.
                  {primarySurveys.length === 0 && ' Upload a primary survey from the run detail page.'}
                  {referenceSurveys.length === 0 &&
                    ' Upload a reference survey using the button above.'}
                </Alert>
              ) : null}

              <Stack spacing={3}>
                <SurveySelector
                  label="Primary Survey"
                  surveys={primarySurveys}
                  value={primarySurveyId}
                  onChange={setPrimarySurveyId}
                  disabled={isCreating}
                />

                <SurveySelector
                  label="Reference Survey"
                  surveys={referenceSurveys}
                  value={referenceSurveyId}
                  onChange={setReferenceSurveyId}
                  disabled={isCreating}
                />

                <ComparisonControls
                  ratioFactor={ratioFactor}
                  onRatioFactorChange={setRatioFactor}
                  disabled={isCreating}
                />

                {comparisonError && (
                  <Alert severity="error">
                    <AlertTitle>Comparison Failed</AlertTitle>
                    {comparisonError.message || 'Failed to create comparison. Please try again.'}
                  </Alert>
                )}

                <Box display="flex" justifyContent="flex-end" gap={2}>
                  <Button
                    variant="outlined"
                    onClick={handleReset}
                    disabled={isCreating || (!primarySurveyId && !referenceSurveyId)}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={isCreating ? <CircularProgress size={20} /> : <CompareArrowsIcon />}
                    onClick={handleCompare}
                    disabled={!primarySurveyId || !referenceSurveyId || isCreating}
                  >
                    {isCreating ? 'Calculating...' : 'Compare Surveys'}
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Comparison Results */}
        {currentComparison && (
          <ComparisonResults
            comparison={currentComparison}
            onNewComparison={handleReset}
          />
        )}

        {/* Comparison History */}
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <HistoryIcon color="primary" />
              <Typography variant="h6">
                Comparison History
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <ComparisonHistoryList runId={runId!} />
          </CardContent>
        </Card>
      </Stack>

      {/* Reference Upload Dialog */}
      <ReferenceUploadDialog
        open={uploadDialogOpen}
        runId={runId!}
        onClose={() => setUploadDialogOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </Container>
  );
};
