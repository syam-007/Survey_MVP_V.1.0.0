import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Paper,
  Container,
  Grid,
  Typography,
  Alert,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import {
  useCreateJobMutation,
  useGetCustomersQuery,
  useGetClientsQuery,
  useGetRigsQuery,
  useGetServicesQuery,
} from '../../stores/jobsSlice';
import { useGetWellsQuery } from '../../stores/wellsSlice';
import type { CreateJobInput } from '../../types/job.types';

/**
 * JobCreatePage Component
 * Simplified form for creating a new job with master data selection
 * Master data must be created from the Configuration page
 */
export const JobCreatePage: React.FC = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<CreateJobInput>({
    customer: '',
    client: '',
    well: '',
    rig: '',
    service: '',
    description: null,
  });

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string>('');

  // API Queries
  const { data: customers, isLoading: loadingCustomers } = useGetCustomersQuery({ page_size: 1000 });
  const { data: clients, isLoading: loadingClients } = useGetClientsQuery({ page_size: 1000 });
  const { data: rigs, isLoading: loadingRigs } = useGetRigsQuery({ page_size: 1000 });
  const { data: services, isLoading: loadingServices } = useGetServicesQuery({ page_size: 1000 });
  const { data: wells, isLoading: loadingWells } = useGetWellsQuery({ page_size: 1000 });

  const [createJob, { isLoading: isCreating }] = useCreateJobMutation();

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer) newErrors.customer = 'Customer is required';
    if (!formData.client) newErrors.client = 'Client is required';
    if (!formData.well) newErrors.well = 'Well is required';
    if (!formData.rig) newErrors.rig = 'Rig is required';
    if (!formData.service) newErrors.service = 'Service is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const job = await createJob(formData).unwrap();
      navigate(`/jobs/${job.id}`);
    } catch (error: any) {
      console.error('Failed to create job:', error);
      setApiError(error?.data?.detail || 'Failed to create job. Please try again.');
    }
  };

  // Handle form field changes
  const handleChange = (field: keyof CreateJobInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Container maxWidth="lg">
      <PageHeader
        title="Create Job"
        subtitle="Job number will be auto-generated (e.g., OM1001)"
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Jobs', path: '/jobs' },
          { label: 'Create' },
        ]}
      />

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* API Error */}
            {apiError && (
              <Grid item xs={12}>
                <Alert severity="error" onClose={() => setApiError('')}>
                  {apiError}
                </Alert>
              </Grid>
            )}

            {/* Info Alert */}
            <Grid item xs={12}>
              <Alert severity="info">
                • Job number will be automatically generated (OM1001, OM1002, etc.)
                <br />
                
                <br />
                • To create new master data (Customer, Client, Well, Rig, Service), please use the Configuration page
              </Alert>
            </Grid>

            {/* Master Data Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Master Data Selection
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select master data for the job. Create master data from the Configuration page if needed.
              </Typography>
            </Grid>

            {/* Customer */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                fullWidth
                options={customers?.results || []}
                getOptionLabel={(option) => option.customer_name}
                value={customers?.results.find(c => c.id === formData.customer) || null}
                onChange={(_, value) => handleChange('customer', value?.id || '')}
                loading={loadingCustomers}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Customer"
                    error={!!errors.customer}
                    helperText={errors.customer}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingCustomers ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Client */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                fullWidth
                options={clients?.results || []}
                getOptionLabel={(option) => option.client_name}
                value={clients?.results.find(c => c.id === formData.client) || null}
                onChange={(_, value) => handleChange('client', value?.id || '')}
                loading={loadingClients}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Client"
                    error={!!errors.client}
                    helperText={errors.client}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingClients ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Well */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                fullWidth
                options={wells?.results || []}
                getOptionLabel={(option) => `${option.well_id} - ${option.well_name}`}
                value={wells?.results.find(w => w.id === formData.well) || null}
                onChange={(_, value) => handleChange('well', value?.id || '')}
                loading={loadingWells}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Well"
                    error={!!errors.well}
                    helperText={errors.well}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingWells ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Rig */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                fullWidth
                options={rigs?.results || []}
                getOptionLabel={(option) => `${option.rig_id} - ${option.rig_number}`}
                value={rigs?.results.find(r => r.id === formData.rig) || null}
                onChange={(_, value) => handleChange('rig', value?.id || '')}
                loading={loadingRigs}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Rig"
                    error={!!errors.rig}
                    helperText={errors.rig}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingRigs ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Service */}
            <Grid item xs={12}>
              <Autocomplete
                fullWidth
                options={services?.results || []}
                getOptionLabel={(option) => option.service_name}
                value={services?.results.find(s => s.id === formData.service) || null}
                onChange={(_, value) => handleChange('service', value?.id || '')}
                loading={loadingServices}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Service"
                    error={!!errors.service}
                    helperText={errors.service}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingServices ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Description */}

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value || null)}
                helperText="Optional job description"
              />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => navigate('/jobs')}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Job'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};
