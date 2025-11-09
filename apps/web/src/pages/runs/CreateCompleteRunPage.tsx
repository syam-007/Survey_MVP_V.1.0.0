import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, CircularProgress, Box, Button, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { SuccessSnackbar } from '../../components/common/SuccessSnackbar';
import { CompleteRunForm } from '../../components/forms/CompleteRunForm';
import type { CompleteRunFormData } from '../../components/forms/CompleteRunForm';
import runsService from '../../services/runsService';
import locationsService from '../../services/locationsService';
import depthsService from '../../services/depthsService';
import surveysService from '../../services/surveysService';
import tieonsService from '../../services/tieonsService';
import wellsService from '../../services/wellsService';
import jobsService from '../../services/jobsService';
import { jobsApi } from '../../stores/jobsSlice';

/**
 * CreateCompleteRunPage Component
 * Multi-step form page to create a complete run with all information
 * Based on Story 3.5 - Frontend Integration: Complete Run Creation Workflow
 */
export const CreateCompleteRunPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const jobIdFromUrl = searchParams.get('job'); // Get job ID from URL query param

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [wells, setWells] = useState<Array<any>>([]);
  const [isLoadingWells, setIsLoadingWells] = useState(true);
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [jobWellId, setJobWellId] = useState<string | null>(null);

  // Fetch job data if coming from job to get the well ID
  useEffect(() => {
    const fetchJobData = async () => {
      if (jobIdFromUrl) {
        try {
          setIsLoadingJob(true);
          const job = await jobsService.getJobById(jobIdFromUrl);
          setJobWellId(job.well?.id || null);
        } catch (err) {
          console.error('Failed to fetch job data:', err);
          // Don't set error, just proceed without pre-filled well
        } finally {
          setIsLoadingJob(false);
        }
      }
    };
    fetchJobData();
  }, [jobIdFromUrl]);

  // Fetch wells on component mount - keep full Well objects
  useEffect(() => {
    const fetchWells = async () => {
      try {
        setIsLoadingWells(true);
        const response = await wellsService.getWells({ page_size: 1000 });
        setWells(response.results); // Keep full Well objects
      } catch (err) {
        console.error('Failed to fetch wells:', err);
        setError(err as Error);
      } finally {
        setIsLoadingWells(false);
      }
    };
    fetchWells();
  }, []);

  // Prepare initial data with job ID and well ID from URL if available
  const formInitialData = {
    run: {
      ...(jobIdFromUrl && { job: jobIdFromUrl }),
      ...(jobWellId && { well: jobWellId }),
    },
  };

  /**
   * Handle complete form submission
   * Sequential API calls: Run → Location → Depth → Survey → TieOn
   */
  const handleSubmit = async (data: CompleteRunFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('=== CREATING COMPLETE RUN ===');
      console.log('Form Data:', data);

      // Step 1: Create the Run
      console.log('Step 1: Creating Run...', data.run);
      const createdRun = await runsService.createRun(data.run as any);
      const runId = createdRun.id;
      const jobId = createdRun.job;
      console.log('✓ Run created:', runId, 'for job:', jobId);

      // Step 2: Create Location (linked to run)
      const locationData = {
        ...data.location,
        run: runId,
      };
      console.log('Step 2: Creating Location...');
      console.log('Full location data:', JSON.stringify(locationData, null, 2));
      await locationsService.createLocation(locationData as any);
      console.log('✓ Location created');

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

      // Invalidate job cache to refetch runs and run count
      const targetJobId = jobIdFromUrl || jobId;
      if (targetJobId) {
        dispatch(jobsApi.util.invalidateTags([{ type: 'Job', id: targetJobId }]));
      }

      setTimeout(() => {
        // Navigate to job detail page to see the newly created run
        if (targetJobId) {
          navigate(`/jobs/${targetJobId}`);
        } else {
          navigate(`/runs/${runId}`);
        }
      }, 1000);
    } catch (err) {
      console.error('Failed to create complete run:', err);
      setError(err as Error);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Navigate back to job detail page if coming from a job, otherwise to runs list
    const targetPath = jobIdFromUrl ? `/jobs/${jobIdFromUrl}` : '/runs';
    console.log('Cancel button clicked, navigating to:', targetPath);
    // Use window.location to force a full page reload
    window.location.href = targetPath;
  };

  const handleBack = () => {
    const targetPath = jobIdFromUrl ? `/jobs/${jobIdFromUrl}` : '/runs';
    console.log('Back button clicked, navigating to:', targetPath);
    // Use window.location to force a full page reload
    window.location.href = targetPath;
  };

  return (
    <Container maxWidth="lg">
      {/* Header with Back Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to {jobIdFromUrl ? 'Job' : 'Runs'}
        </Button>
        <Typography variant="h4" component="h1">
          Create Complete Run
        </Typography>
      </Box>

      {isLoadingWells || (jobIdFromUrl && isLoadingJob) ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <CompleteRunForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          wells={wells}
          error={error}
          initialData={formInitialData}
        />
      )}

      <SuccessSnackbar
        open={snackbarOpen}
        message="Run created successfully! Redirecting to job..."
        onClose={() => setSnackbarOpen(false)}
      />
    </Container>
  );
};
