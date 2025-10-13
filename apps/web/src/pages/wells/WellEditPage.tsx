import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { WellForm } from '../../components/forms/WellForm';
import { useGetWellByIdQuery, useUpdateWellMutation } from '../../stores/wellsSlice';
import type { CreateWellInput } from '../../types/well.types';

/**
 * WellEditPage Component
 * Page for editing an existing well
 * Based on Story 2.5 AC#4
 */
export const WellEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: well, isLoading, error, refetch } = useGetWellByIdQuery(id!);
  const [updateWell, { isLoading: isUpdating }] = useUpdateWellMutation();
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateWellInput) => {
    if (!id) return;

    try {
      setApiError(null);
      await updateWell({ id, data }).unwrap();
      // Navigate to detail page on success
      navigate(`/wells/${id}`);
    } catch (err: any) {
      console.error('Failed to update well:', err);
      // Extract error message from API response
      if (err.data?.well_name) {
        setApiError(`Well name: ${err.data.well_name.join(', ')}`);
      } else if (err.data?.detail) {
        setApiError(err.data.detail);
      } else {
        setApiError('Failed to update well. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    navigate(`/wells/${id}`);
  };

  if (isLoading) {
    return (
      <Container maxWidth="md">
        <SkeletonLoader variant="detail" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <ErrorAlert
          error={error as Error}
          title="Failed to load well"
          onRetry={refetch}
        />
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/wells')}
          sx={{ mt: 2 }}
        >
          Back to Wells
        </Button>
      </Container>
    );
  }

  if (!well) {
    return (
      <Container maxWidth="md">
        <ErrorAlert error="Well not found (404)" />
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/wells')}
          sx={{ mt: 2 }}
        >
          Back to Wells
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <PageHeader
        title="Edit Well"
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Wells', path: '/wells' },
          { label: well.well_name, path: `/wells/${id}` },
          { label: 'Edit' },
        ]}
      />

      {apiError && (
        <ErrorAlert
          error={apiError}
          onRetry={() => setApiError(null)}
        />
      )}

      <WellForm
        initialValues={{
          well_name: well.well_name,
          well_type: well.well_type,
        }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isUpdating}
        submitLabel="Update Well"
      />
    </Container>
  );
};
