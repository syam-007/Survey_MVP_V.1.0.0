import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  Job,
  JobDetail,
  JobListItem,
  CreateJobInput,
  UpdateJobInput,
  JobFilters,
  PaginatedJobResponse,
  Customer,
  Client,
  Rig,
  Service,
  CreateCustomerInput,
  CreateClientInput,
  CreateRigInput,
  CreateServiceInput,
  MasterDataFilters,
  PaginatedCustomerResponse,
  PaginatedClientResponse,
  PaginatedRigResponse,
  PaginatedServiceResponse,
} from '../types/job.types';
import type { RootState } from './store';
import config from '../config/env';

const API_BASE_URL = config.apiBaseUrl;

console.log('🔧 JobsSlice - API_BASE_URL:', API_BASE_URL);
console.log('🔧 JobsSlice - Full base URL:', `${API_BASE_URL}/api/v1`);

/**
 * Jobs API Slice using RTK Query
 * Provides auto-generated hooks for job and master data management operations
 */
export const jobsApi = createApi({
  reducerPath: 'jobsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/api/v1`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.tokens?.access;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      console.log('🔧 JobsSlice - Making request with headers:', {
        Authorization: headers.get('Authorization')?.substring(0, 20) + '...',
        baseUrl: `${API_BASE_URL}/api/v1`,
      });
      return headers;
    },
  }),
  tagTypes: ['Job', 'Customer', 'Client', 'Rig', 'Service'],
  endpoints: (builder) => ({
    // ===== JOB ENDPOINTS =====

    /**
     * Get paginated list of jobs with filters
     */
    getJobs: builder.query<PaginatedJobResponse, JobFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();

        if (filters) {
          if (filters.page) params.append('page', filters.page.toString());
          if (filters.page_size) params.append('page_size', filters.page_size.toString());
          if (filters.search) params.append('search', filters.search);
          if (filters.ordering) params.append('ordering', filters.ordering);
          if (filters.customer) params.append('customer', filters.customer);
          if (filters.client) params.append('client', filters.client);
          if (filters.well) params.append('well', filters.well);
          if (filters.rig) params.append('rig', filters.rig);
          if (filters.service) params.append('service', filters.service);
          if (filters.status) params.append('status', filters.status);
          if (filters.start_date_after) params.append('start_date_after', filters.start_date_after);
          if (filters.start_date_before) params.append('start_date_before', filters.start_date_before);
        }

        return {
          url: `/jobs/?${params.toString()}`,
        };
      },
      providesTags: () => [{ type: 'Job', id: 'LIST' }],
    }),

    /**
     * Get single job by ID with full nested data
     */
    getJobById: builder.query<JobDetail, string>({
      query: (id) => `/jobs/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'Job', id }],
    }),

    /**
     * Create new job
     */
    createJob: builder.mutation<Job, CreateJobInput>({
      query: (data) => ({
        url: '/jobs/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Job', id: 'LIST' }],
    }),

    /**
     * Update job (partial update)
     */
    updateJob: builder.mutation<Job, { id: string; data: UpdateJobInput }>({
      query: ({ id, data }) => ({
        url: `/jobs/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Job', id },
        { type: 'Job', id: 'LIST' },
      ],
    }),

    /**
     * Delete job
     */
    deleteJob: builder.mutation<void, string>({
      query: (id) => ({
        url: `/jobs/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Job', id: 'LIST' }],
    }),

    /**
     * Get runs for a specific job
     */
    getJobRuns: builder.query<any[], string>({
      query: (id) => `/jobs/${id}/runs/`,
      transformResponse: (response: any) => response.results || [],
      providesTags: (_result, _error, id) => [{ type: 'Job', id }],
    }),

    /**
     * Get job statistics
     */
    getJobStatistics: builder.query<any, void>({
      query: () => '/jobs/statistics/',
    }),

    // ===== CUSTOMER ENDPOINTS =====

    /**
     * Get paginated list of customers
     */
    getCustomers: builder.query<PaginatedCustomerResponse, MasterDataFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();

        if (filters) {
          if (filters.page) params.append('page', filters.page.toString());
          if (filters.page_size) params.append('page_size', filters.page_size.toString());
          if (filters.search) params.append('search', filters.search);
          if (filters.ordering) params.append('ordering', filters.ordering);
          if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        }

        return {
          url: `/customers/?${params.toString()}`,
        };
      },
      providesTags: () => [{ type: 'Customer', id: 'LIST' }],
    }),

    /**
     * Get single customer by ID
     */
    getCustomerById: builder.query<Customer, string>({
      query: (id) => `/customers/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'Customer', id }],
    }),

    /**
     * Create new customer
     */
    createCustomer: builder.mutation<Customer, CreateCustomerInput>({
      query: (data) => ({
        url: '/customers/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
    }),

    /**
     * Update customer
     */
    updateCustomer: builder.mutation<Customer, { id: string; data: Partial<CreateCustomerInput> }>({
      query: ({ id, data }) => ({
        url: `/customers/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' },
      ],
    }),

    /**
     * Delete customer
     */
    deleteCustomer: builder.mutation<void, string>({
      query: (id) => ({
        url: `/customers/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
    }),

    /**
     * Get clients for a specific customer
     */
    getCustomerClients: builder.query<Client[], string>({
      query: (id) => `/customers/${id}/clients/`,
      providesTags: (_result, _error, id) => [{ type: 'Customer', id }, { type: 'Client', id: 'LIST' }],
    }),

    // ===== CLIENT ENDPOINTS =====

    /**
     * Get paginated list of clients
     */
    getClients: builder.query<PaginatedClientResponse, MasterDataFilters & { customer?: string } | void>({
      query: (filters) => {
        const params = new URLSearchParams();

        if (filters) {
          if (filters.page) params.append('page', filters.page.toString());
          if (filters.page_size) params.append('page_size', filters.page_size.toString());
          if (filters.search) params.append('search', filters.search);
          if (filters.ordering) params.append('ordering', filters.ordering);
          if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
          if (filters.customer) params.append('customer', filters.customer);
        }

        return {
          url: `/clients/?${params.toString()}`,
        };
      },
      providesTags: () => [{ type: 'Client', id: 'LIST' }],
    }),

    /**
     * Get single client by ID
     */
    getClientById: builder.query<Client, string>({
      query: (id) => `/clients/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'Client', id }],
    }),

    /**
     * Create new client
     */
    createClient: builder.mutation<Client, CreateClientInput>({
      query: (data) => ({
        url: '/clients/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Client', id: 'LIST' }],
    }),

    /**
     * Update client
     */
    updateClient: builder.mutation<Client, { id: string; data: Partial<CreateClientInput> }>({
      query: ({ id, data }) => ({
        url: `/clients/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Client', id },
        { type: 'Client', id: 'LIST' },
      ],
    }),

    /**
     * Delete client
     */
    deleteClient: builder.mutation<void, string>({
      query: (id) => ({
        url: `/clients/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Client', id: 'LIST' }],
    }),

    // ===== RIG ENDPOINTS =====

    /**
     * Get paginated list of rigs
     */
    getRigs: builder.query<PaginatedRigResponse, MasterDataFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();

        if (filters) {
          if (filters.page) params.append('page', filters.page.toString());
          if (filters.page_size) params.append('page_size', filters.page_size.toString());
          if (filters.search) params.append('search', filters.search);
          if (filters.ordering) params.append('ordering', filters.ordering);
          if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        }

        return {
          url: `/rigs/?${params.toString()}`,
        };
      },
      providesTags: () => [{ type: 'Rig', id: 'LIST' }],
    }),

    /**
     * Get single rig by ID
     */
    getRigById: builder.query<Rig, string>({
      query: (id) => `/rigs/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'Rig', id }],
    }),

    /**
     * Create new rig
     */
    createRig: builder.mutation<Rig, CreateRigInput>({
      query: (data) => ({
        url: '/rigs/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Rig', id: 'LIST' }],
    }),

    /**
     * Update rig
     */
    updateRig: builder.mutation<Rig, { id: string; data: Partial<CreateRigInput> }>({
      query: ({ id, data }) => ({
        url: `/rigs/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Rig', id },
        { type: 'Rig', id: 'LIST' },
      ],
    }),

    /**
     * Delete rig
     */
    deleteRig: builder.mutation<void, string>({
      query: (id) => ({
        url: `/rigs/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Rig', id: 'LIST' }],
    }),

    // ===== SERVICE ENDPOINTS =====

    /**
     * Get paginated list of services
     */
    getServices: builder.query<PaginatedServiceResponse, MasterDataFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();

        if (filters) {
          if (filters.page) params.append('page', filters.page.toString());
          if (filters.page_size) params.append('page_size', filters.page_size.toString());
          if (filters.search) params.append('search', filters.search);
          if (filters.ordering) params.append('ordering', filters.ordering);
          if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        }

        return {
          url: `/services/?${params.toString()}`,
        };
      },
      providesTags: () => [{ type: 'Service', id: 'LIST' }],
    }),

    /**
     * Get single service by ID
     */
    getServiceById: builder.query<Service, string>({
      query: (id) => `/services/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'Service', id }],
    }),

    /**
     * Create new service
     */
    createService: builder.mutation<Service, CreateServiceInput>({
      query: (data) => ({
        url: '/services/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Service', id: 'LIST' }],
    }),

    /**
     * Update service
     */
    updateService: builder.mutation<Service, { id: string; data: Partial<CreateServiceInput> }>({
      query: ({ id, data }) => ({
        url: `/services/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Service', id },
        { type: 'Service', id: 'LIST' },
      ],
    }),

    /**
     * Delete service
     */
    deleteService: builder.mutation<void, string>({
      query: (id) => ({
        url: `/services/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Service', id: 'LIST' }],
    }),
  }),
});

// Export hooks for usage in components
export const {
  // Job hooks
  useGetJobsQuery,
  useGetJobByIdQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  useDeleteJobMutation,
  useGetJobRunsQuery,
  useGetJobStatisticsQuery,
  // Customer hooks
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useGetCustomerClientsQuery,
  // Client hooks
  useGetClientsQuery,
  useGetClientByIdQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  // Rig hooks
  useGetRigsQuery,
  useGetRigByIdQuery,
  useCreateRigMutation,
  useUpdateRigMutation,
  useDeleteRigMutation,
  // Service hooks
  useGetServicesQuery,
  useGetServiceByIdQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
} = jobsApi;
