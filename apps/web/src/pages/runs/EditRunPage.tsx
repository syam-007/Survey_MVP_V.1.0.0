import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { SuccessSnackbar } from '../../components/common/SuccessSnackbar';
import { RunForm } from '../../components/forms/RunForm';
import { useGetRunByIdQuery, usePatchRunMutation } from '../../stores/runsSlice';
import type { CreateRunInput } from '../../types/run.types';

/**
 * EditRunPage Component
 * Form page to edit an existing run
 * Based on Story 2.4 AC#4
 */
export const EditRunPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: run, isLoading, error } = useGetRunByIdQuery(id!);
  const [patchRun, { isLoading: isUpdating, error: updateError }] = usePatchRunMutation();

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleSubmit = async (data: CreateRunInput) => {
    if (!id) return;

    try {
      await patchRun({ id, data }).unwrap();
      setSnackbarOpen(true);
      // Redirect to detail page after successful update
      setTimeout(() => {
        navigate(`/runs/${id}`);
      }, 1000);
    } catch (error) {
      console.error('Failed to update run:', error);
    }
  };

  const handleCancel = () => {
    navigate(`/runs/${id}`);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <LoadingSpinner message="Loading run data..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <ErrorAlert
          error={error as Error}
          title="Failed to load run"
        />
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/runs')}
          sx={{ mt: 2 }}
        >
          Back to Runs
        </Button>
      </Container>
    );
  }

  if (!run) {
    return (
      <Container maxWidth="lg">
        <ErrorAlert error="Run not found" />
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/runs')}
          sx={{ mt: 2 }}
        >
          Back to Runs
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <PageHeader
        title={`Edit Run: ${run.run_name}`}
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Runs', path: '/runs' },
          { label: run.run_number, path: `/runs/${id}` },
          { label: 'Edit' },
        ]}
      />

      {updateError && (
        <ErrorAlert
          error={updateError as Error}
          title="Failed to update run"
        />
      )}

      <RunForm
        initialValues={{
          run_number: run.run_number,
          run_name: run.run_name,
          run_type: run.run_type,
          vertical_section: run.vertical_section,
          bhc_enabled: run.bhc_enabled,
          proposal_direction: run.proposal_direction,
          grid_correction: run.grid_correction,
          well: run.well?.id || null,
        }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isUpdating}
        submitLabel="Update Run"
      />

      <SuccessSnackbar
        open={snackbarOpen}
        message="Run updated successfully! Redirecting..."
        onClose={() => setSnackbarOpen(false)}
      />
    </Container>
  );
};
