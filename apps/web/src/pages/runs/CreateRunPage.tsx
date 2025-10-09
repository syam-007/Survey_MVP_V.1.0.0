import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '@mui/material';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { SuccessSnackbar } from '../../components/common/SuccessSnackbar';
import { RunForm } from '../../components/forms/RunForm';
import { useCreateRunMutation } from '../../stores/runsSlice';
import type { CreateRunInput } from '../../types/run.types';

/**
 * CreateRunPage Component
 * Form page to create a new run
 * Based on Story 2.4 AC#2
 */
export const CreateRunPage: React.FC = () => {
  const navigate = useNavigate();
  const [createRun, { isLoading, error }] = useCreateRunMutation();

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleSubmit = async (data: CreateRunInput) => {
    try {
      const result = await createRun(data).unwrap();
      setSnackbarOpen(true);
      // Redirect to detail page after successful creation
      setTimeout(() => {
        navigate(`/runs/${result.id}`);
      }, 1000);
    } catch (error) {
      console.error('Failed to create run:', error);
    }
  };

  const handleCancel = () => {
    navigate('/runs');
  };

  return (
    <Container maxWidth="lg">
      <PageHeader
        title="Create Run"
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Runs', path: '/runs' },
          { label: 'Create' },
        ]}
      />

      {error && (
        <ErrorAlert
          error={error as Error}
          title="Failed to create run"
        />
      )}

      <RunForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isLoading}
        submitLabel="Create Run"
      />

      <SuccessSnackbar
        open={snackbarOpen}
        message="Run created successfully! Redirecting..."
        onClose={() => setSnackbarOpen(false)}
      />
    </Container>
  );
};
