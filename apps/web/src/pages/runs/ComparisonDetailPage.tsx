/**
 * ComparisonDetailPage Component
 *
 * Detailed view of a comparison with comprehensive visualizations.
 * Based on Story 5.4: Comparison Visualization (2D & 3D)
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Button,
  Box,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { ComparisonResults } from '../../components/comparison/ComparisonResults';
import { useComparison } from '../../hooks/useComparison';

export const ComparisonDetailPage: React.FC = () => {
  const { id: runId, comparisonId } = useParams<{ id: string; comparisonId: string }>();
  const navigate = useNavigate();

  const { data: comparison, isLoading, error, refetch } = useComparison(comparisonId!);

  if (isLoading) {
    return (
      <Container maxWidth="xl">
        <SkeletonLoader variant="detail" />
      </Container>
    );
  }

  if (error || !comparison) {
    return (
      <Container maxWidth="xl">
        <ErrorAlert
          error={error as Error}
          title="Failed to load comparison"
          onRetry={refetch}
        />
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/runs/${runId}/comparison`)}
          sx={{ mt: 2 }}
        >
          Back to Comparison
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <PageHeader
        title="Comparison Details"
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Runs', path: '/runs' },
          { label: comparison.run_info.run_name, path: `/runs/${runId}` },
          { label: 'Comparison', path: `/runs/${runId}/comparison` },
          { label: 'Details' },
        ]}
        actions={
          <Box display="flex" gap={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/runs/${runId}/comparison`)}
            >
              Back to Comparison
            </Button>
          </Box>
        }
      />

      <ComparisonResults
        comparison={comparison}
        onNewComparison={() => navigate(`/runs/${runId}/comparison`)}
      />
    </Container>
  );
};
