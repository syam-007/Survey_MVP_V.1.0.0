import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '@mui/material';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { WellForm } from '../../components/forms/WellForm';
import { useCreateWellMutation } from '../../stores/wellsSlice';
import type { CreateWellInput } from '../../types/well.types';

/**
 * WellCreatePage Component
 * Page for creating a new well
 * Based on Story 2.5 AC#2
 */
export const WellCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [createWell, { isLoading, error }] = useCreateWellMutation();
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateWellInput) => {
    try {
      setApiError(null);
      const result = await createWell(data).unwrap();
      // Navigate to detail page on success
      navigate(`/wells/${result.id}`);
    } catch (err: any) {
      console.error('Failed to create well:', err);
      // Extract error message from API response
      if (err.data?.well_name) {
        setApiError(`Well name: ${err.data.well_name.join(', ')}`);
      } else if (err.data?.detail) {
        setApiError(err.data.detail);
      } else {
        setApiError('Failed to create well. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    navigate('/wells');
  };

  return (
    <Container maxWidth="md">
      <PageHeader
        title="Create Well"
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Wells', path: '/wells' },
          { label: 'Create' },
        ]}
      />

      {apiError && (
        <ErrorAlert
          error={apiError}
          onRetry={() => setApiError(null)}
        />
      )}

      <WellForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isLoading}
        submitLabel="Create Well"
      />
    </Container>
  );
};
