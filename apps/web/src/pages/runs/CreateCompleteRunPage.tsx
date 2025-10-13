import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, CircularProgress, Box } from '@mui/material';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { SuccessSnackbar } from '../../components/common/SuccessSnackbar';
import { CompleteRunForm, CompleteRunFormData } from '../../components/forms/CompleteRunForm';
import runsService from '../../services/runsService';
import locationsService from '../../services/locationsService';
import depthsService from '../../services/depthsService';
import surveysService from '../../services/surveysService';
import tieonsService from '../../services/tieonsService';
import wellsService from '../../services/wellsService';

/**
 * CreateCompleteRunPage Component
 * Multi-step form page to create a complete run with all information
 * Based on Story 3.5 - Frontend Integration: Complete Run Creation Workflow
 */
export const CreateCompleteRunPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [wells, setWells] = useState<Array<{ id: string; well_name: string }>>([]);
  const [isLoadingWells, setIsLoadingWells] = useState(true);

  // Fetch wells on component mount
  useEffect(() => {
    const fetchWells = async () => {
      try {
        setIsLoadingWells(true);
        const response = await wellsService.getWells({ page_size: 1000 });
        setWells(response.results.map(well => ({ id: well.id, well_name: well.well_name })));
      } catch (err) {
        console.error('Failed to fetch wells:', err);
        setError(err as Error);
      } finally {
        setIsLoadingWells(false);
      }
    };
    fetchWells();
  }, []);

  /**
   * Handle complete form submission
   * Sequential API calls: Run → Location → Depth → Survey → TieOn
   */
  const handleSubmit = async (data: CompleteRunFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Create the Run
      const createdRun = await runsService.createRun(data.run as any);
      const runId = createdRun.id;

      // Step 2: Create Location (linked to run)
      await locationsService.createLocation({
        ...data.location,
        run: runId,
      } as any);

      // Step 3: Create Depth (linked to run and well)
      await depthsService.createDepth({
        ...data.depth,
        run: runId,
        well: createdRun.well.id,
      } as any);

      // Step 4: Create Survey (linked to run)
      await surveysService.createSurvey({
        ...data.survey,
        run: runId,
      } as any);

      // Step 5: Create TieOn (linked to run)
      await tieonsService.createTieOn({
        ...data.tieon,
        run: runId,
      } as any);

      // Success!
      setSnackbarOpen(true);
      setTimeout(() => {
        navigate(`/runs/${runId}`);
      }, 1000);
    } catch (err) {
      console.error('Failed to create complete run:', err);
      setError(err as Error);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/runs');
  };

  return (
    <Container maxWidth="lg">
      <PageHeader
        title="Create Complete Run"
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Runs', path: '/runs' },
          { label: 'Create Complete Run' },
        ]}
      />

      {error && (
        <ErrorAlert
          error={error}
          title="Failed to load data"
        />
      )}

      {isLoadingWells ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <CompleteRunForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          wells={wells}
        />
      )}

      <SuccessSnackbar
        open={snackbarOpen}
        message="Complete run created successfully! Redirecting..."
        onClose={() => setSnackbarOpen(false)}
      />
    </Container>
  );
};
