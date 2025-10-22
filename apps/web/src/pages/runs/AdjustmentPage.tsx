/**
 * AdjustmentPage Component
 *
 * Lists all comparisons for a run and allows selecting one for curve adjustment.
 * Provides quick access to the adjustment workflow.
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Tune as TuneIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { useGetRunByIdQuery } from '../../stores/runsSlice';
import { useComparisonHistory } from '../../hooks/useComparison';

export const AdjustmentPage: React.FC = () => {
  const { id: runId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch run details
  const { data: run, isLoading: runLoading, error: runError } = useGetRunByIdQuery(runId!);

  // Fetch comparisons list
  const {
    data: comparisonsData,
    isLoading: comparisonsLoading,
    error: comparisonsError,
  } = useComparisonHistory(runId!, 1, 100);

  const isLoading = runLoading || comparisonsLoading;
  const error = runError || comparisonsError;

  if (isLoading) {
    return (
      <Container maxWidth="xl">
        <SkeletonLoader variant="detail" />
      </Container>
    );
  }

  if (error || !run) {
    return (
      <Container maxWidth="xl">
        <ErrorAlert
          title="Failed to load data"
          message={error?.toString() || 'Run not found'}
        />
      </Container>
    );
  }

  const comparisons = comparisonsData?.results || [];

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <PageHeader
          title="Curve Adjustment"
          subtitle={`Select a comparison to adjust for ${run.run_name}`}
          backButton={{
            label: 'Back to Run',
            onClick: () => navigate(`/runs/${runId}`),
          }}
        />

        {/* Info Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <TuneIcon color="info" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Curve Adjustment Workflow
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Select a comparison below to apply offsets, adjust the comparative survey curve,
                  and recalculate survey parameters. All changes support undo/redo functionality.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Comparisons List */}
        {comparisons.length === 0 ? (
          <Alert severity="info">
            <Typography variant="body1" gutterBottom>
              No comparisons available for adjustment.
            </Typography>
            <Typography variant="body2">
              Create a comparison first by going to the "Survey Comparison" page.
            </Typography>
            <Button
              variant="contained"
              size="small"
              sx={{ mt: 2 }}
              onClick={() => navigate(`/runs/${runId}/comparison`)}
            >
              Go to Survey Comparison
            </Button>
          </Alert>
        ) : (
          <Stack spacing={2}>
            <Typography variant="h6" gutterBottom>
              Available Comparisons ({comparisons.length})
            </Typography>

            {comparisons.map((comparison) => (
              <Card key={comparison.id} elevation={2}>
                <CardContent>
                  <Stack direction="row" spacing={3} alignItems="center">
                    {/* Comparison Info */}
                    <Box flex={1}>
                      <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                        <Typography variant="h6">
                          Comparison {comparison.id.substring(0, 8)}...
                        </Typography>
                        <Chip
                          label={`${comparison.point_count} points`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Stack>

                      <Stack direction="row" spacing={4} mb={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Primary Survey
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {comparison.primary_survey_info.file_name}
                          </Typography>
                          <Chip
                            label={comparison.primary_survey_info.survey_type}
                            size="small"
                            sx={{ mt: 0.5 }}
                          />
                        </Box>

                        <Divider orientation="vertical" flexItem />

                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Reference Survey
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {comparison.reference_survey_info.file_name}
                          </Typography>
                          <Chip
                            label={comparison.reference_survey_info.survey_type}
                            size="small"
                            color="secondary"
                            sx={{ mt: 0.5 }}
                          />
                        </Box>

                        <Divider orientation="vertical" flexItem />

                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Statistics
                          </Typography>
                          <Typography variant="body2">
                            Max Δ: {comparison.max_deviation.toFixed(2)}m
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Resolution: {comparison.ratio_factor}m
                          </Typography>
                        </Box>
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        Created {format(new Date(comparison.created_at), 'MMM dd, yyyy hh:mm a')} by{' '}
                        {comparison.created_by_username}
                      </Typography>
                    </Box>

                    {/* Action Buttons */}
                    <Stack direction="column" spacing={1}>
                      <Button
                        variant="contained"
                        color="info"
                        startIcon={<TuneIcon />}
                        onClick={() => navigate(`/runs/${runId}/adjustment/${comparison.id}`)}
                      >
                        Adjust Curve
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => navigate(`/runs/${runId}/comparisons/${comparison.id}`)}
                      >
                        View Comparison
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Container>
  );
};
